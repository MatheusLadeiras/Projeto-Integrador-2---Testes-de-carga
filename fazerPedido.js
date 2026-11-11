const express = require('express');
const mysql = require('mysql2/promise');

const router = express.Router();

// Pool de conexões MySQL otimizado para testes de carga (Grafana k6)
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


function iniciarJanelaHomologacao48h(dataBase = new Date()) {
  const dataLimite = new Date(dataBase.getTime());
  dataLimite.setHours(dataLimite.getHours() + 48);
  return dataLimite;
}

router.post('/pedidos', async (req, res) => {
  const { codigoAnuncio, idComprador } = req.body;

  if (!codigoAnuncio || !idComprador) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: codigoAnuncio, idComprador.',
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [compradores] = await connection.execute(
      'SELECT idUsuario FROM Usuario WHERE idUsuario = ? LIMIT 1',
      [idComprador]
    );

    if (compradores.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        erro: 'Comprador (idComprador) não encontrado.',
      });
    }

    const [anuncios] = await connection.execute(
      `SELECT codigoAnuncio, precoVenda, valorLiquidoVendedor, status, idVendedor
       FROM Anuncio
       WHERE codigoAnuncio = ?
       FOR UPDATE`,
      [codigoAnuncio]
    );

    if (anuncios.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        erro: 'Anúncio não encontrado.',
      });
    }

    const anuncio = anuncios[0];

    if (anuncio.status !== 'ATIVO') {
      await connection.rollback();
      return res.status(409).json({
        erro: `Anúncio indisponível para compra (status atual: ${anuncio.status}).`,
      });
    }

    if (Number(anuncio.idVendedor) === Number(idComprador)) {
      await connection.rollback();
      return res.status(422).json({
        erro: 'O comprador não pode adquirir o próprio anúncio.',
      });
    }

    const dataHoraCriacao = new Date();
    const dataLimiteHomologacao = iniciarJanelaHomologacao48h(dataHoraCriacao);
    const valorTotalTransacao = Number(anuncio.precoVenda);
    const valorLiquidoVendedor = Number(anuncio.valorLiquidoVendedor);
    const statusPedido = 'AGUARDANDO_ENVIO';

    await connection.execute(
      'UPDATE Anuncio SET status = ? WHERE codigoAnuncio = ?',
      ['VENDIDO', codigoAnuncio]
    );

    // 4. Insere o Pedido vinculado ao Anuncio e ao Comprador
    const [resultadoPedido] = await connection.execute(
      `INSERT INTO Pedido (
        dataHoraCriacao,
        valorTotalTransacao,
        status,
        dataLimiteHomologacao,
        codigoAnuncio,
        idComprador
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dataHoraCriacao,
        valorTotalTransacao,
        statusPedido,
        dataLimiteHomologacao,
        codigoAnuncio,
        idComprador,
      ]
    );

    const idPedido = resultadoPedido.insertId;

    const statusCustodia = 'RETIDA';
    const [resultadoCustodia] = await connection.execute(
      `INSERT INTO ContaCustodia (
        montanteRetido,
        status,
        idPedido
      ) VALUES (?, ?, ?)`,
      [valorTotalTransacao, statusCustodia, idPedido]
    );

    await connection.execute(
      `UPDATE Usuario
       SET saldoBloqueado = saldoBloqueado + ?
       WHERE idUsuario = ?`,
      [valorLiquidoVendedor, anuncio.idVendedor]
    );

    await connection.commit();

    return res.status(201).json({
      idPedido,
      dataHoraCriacao: dataHoraCriacao.toISOString(),
      valorTotalTransacao,
      status: statusPedido,
      dataLimiteHomologacao: dataLimiteHomologacao.toISOString(),
      codigoAnuncio,
      idComprador,
      custodiaFinanceira: {
        idCustodiaTransacao: resultadoCustodia.insertId,
        montanteRetido: valorTotalTransacao,
        status: statusCustodia,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      erro: 'Erro interno ao processar pedido.',
      detalhes: err.message,
    });
  } finally {
    connection.release();
  }
});

if (require.main === module) {
  const app = express();
  app.use(express.json());
  app.use(router);

  const PORT = Number(process.env.PORT_PEDIDO || process.env.PORT) || 3002;
  app.listen(PORT, () => {
    console.log(`Servidor de Pedidos rodando na porta ${PORT}`);
  });
}

module.exports = {
  router,
  pool,
  iniciarJanelaHomologacao48h,
};
