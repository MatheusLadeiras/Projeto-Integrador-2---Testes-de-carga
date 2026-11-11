const express = require('express');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const router = express.Router();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marketplacedehardware',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 50,
  queueLimit: 0,
});

const ESTADOS_CONSERVACAO_VALIDOS = [
  'NOVO',
  'USADO_EXCELENTE',
  'USADO_BOM',
  'COM_DEFEITO',
];

const STATUS_ANUNCIO_VALIDOS = [
  'RASCUNHO',
  'ATIVO',
  'PAUSADO',
  'VENDIDO',
];

function calcularTaxaAntiscalping(precoVenda, mediana) {
  const taxaBase = 0.10;
  const limiteAntiscalping = 1.15 * mediana;
  let aliquotaTaxaAplicada = taxaBase;

  if (mediana > 0 && precoVenda > limiteAntiscalping) {
    const proporcaoExcedente = (precoVenda - limiteAntiscalping) / mediana;
    aliquotaTaxaAplicada = Math.min(0.50, taxaBase + proporcaoExcedente * 0.5);
  }

  aliquotaTaxaAplicada = Number(aliquotaTaxaAplicada.toFixed(4));
  const valorTaxaPlataforma = Number((precoVenda * aliquotaTaxaAplicada).toFixed(2));
  const valorLiquidoVendedor = Number((precoVenda - valorTaxaPlataforma).toFixed(2));

  return {
    aliquotaTaxaAplicada,
    valorTaxaPlataforma,
    valorLiquidoVendedor,
  };
}

router.post('/anuncios', async (req, res) => {
  const {
    codigoAnuncio,
    titulo,
    precoVenda,
    estadoItem,
    status = 'ATIVO',
    idVendedor,
    idParte,
  } = req.body;

  if (!titulo || precoVenda === undefined || !estadoItem || !idVendedor || !idParte) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: titulo, precoVenda, estadoItem, idVendedor, idParte.',
    });
  }

  const precoNumerico = Number(precoVenda);
  if (Number.isNaN(precoNumerico) || precoNumerico <= 0) {
    return res.status(400).json({
      erro: 'precoVenda deve ser um valor numérico maior que zero.',
    });
  }

  if (!ESTADOS_CONSERVACAO_VALIDOS.includes(estadoItem)) {
    return res.status(400).json({
      erro: `estadoItem inválido. Valores aceitos: ${ESTADOS_CONSERVACAO_VALIDOS.join(', ')}.`,
    });
  }

  if (!STATUS_ANUNCIO_VALIDOS.includes(status)) {
    return res.status(400).json({
      erro: `status inválido. Valores aceitos: ${STATUS_ANUNCIO_VALIDOS.join(', ')}.`,
    });
  }

  const codigoGerado = codigoAnuncio || `ANU-${crypto.randomUUID()}`;

  try {
    const [modelos] = await pool.execute(
      'SELECT idParte, precoMedianoHistorico FROM ModeloHardware WHERE idParte = ? LIMIT 1',
      [idParte]
    );

    if (modelos.length === 0) {
      return res.status(404).json({
        erro: 'ModeloHardware (idParte) não encontrado.',
      });
    }

    const [usuarios] = await pool.execute(
      'SELECT idUsuario FROM Usuario WHERE idUsuario = ? LIMIT 1',
      [idVendedor]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        erro: 'Vendedor (idVendedor) não encontrado.',
      });
    }

    const mediana = Number(modelos[0].precoMedianoHistorico) || 0;

    const {
      aliquotaTaxaAplicada,
      valorTaxaPlataforma,
      valorLiquidoVendedor,
    } = calcularTaxaAntiscalping(precoNumerico, mediana);

    // 4. Persiste o Anuncio no MySQL
    await pool.execute(
      `INSERT INTO Anuncio (
        codigoAnuncio,
        titulo,
        precoVenda,
        aliquotaTaxaAplicada,
        valorTaxaPlataforma,
        valorLiquidoVendedor,
        estadoItem,
        status,
        idVendedor,
        idParte
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoGerado,
        titulo,
        precoNumerico,
        aliquotaTaxaAplicada,
        valorTaxaPlataforma,
        valorLiquidoVendedor,
        estadoItem,
        status,
        idVendedor,
        idParte,
      ]
    );

    return res.status(201).json({
      codigoAnuncio: codigoGerado,
      titulo,
      precoVenda: precoNumerico,
      aliquotaTaxaAplicada,
      valorTaxaPlataforma,
      valorLiquidoVendedor,
      estadoItem,
      status,
      idVendedor,
      idParte,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        erro: 'Já existe um anúncio com este codigoAnuncio.',
      });
    }
    return res.status(500).json({
      erro: 'Erro interno ao criar anúncio.',
      detalhes: err.message,
    });
  }
});

if (require.main === module) {
  const app = express();
  app.use(express.json());
  app.use(router);

  const PORT = Number(process.env.PORT_ANUNCIO || process.env.PORT) || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor de Anúncios rodando na porta ${PORT}`);
  });
}

module.exports = {
  router,
  pool,
  calcularTaxaAntiscalping,
};
