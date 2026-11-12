-- ============================================================
-- Popula toda o banco de dados com 2000 intâncias de Usuáios, 1000 anúncios, 1000 modelos de hardware,
-- 1000 categorias, 500 pedidos, 1000 disputas, 1000 evidências, 1000 envios , 1000 contas custodias
-- Essa massa de dados foi criada a fim de popular a tabela para testes, assim ela não necessariamente segue certas especificações do sistema final
-- tal qual apenas permitir usuários "admin" para a moderação de disputas pois a única preocupação é criar uma massa de dados para os Testes de carga
-- ============================================================

-- Estudantes carga1@edu.unirio.br ate carga2000@edu.unirio.br
SET SESSION cte_max_recursion_depth = 5000;

INSERT IGNORE INTO Usuarios (cpf, email, nome_completo, hash_senha, saldo_disponivel, saldo_bloqueado, reputacao_vendas , role)
WITH RECURSIVE n (i) AS (SELECT 1 UNION all SELECT i + 1 FROM n WHERE i < 2000)
select 
    LPAD(i, 11, '0'),
    CONCAT('usuario', i, '@gmail.com'),
    CONCAT('Usuario Carga ', i),
    'f10e2821bbbea527ea02200352313bc059445190',
    100.00 + (i * 5),
    0.00,
    5.0,
    'USER'
FROM n;

INSERT IGNORE INTO Evidencias (hash_arquivo, url_armazenamento, tipo_mime, data_upload)
WITH RECURSIVE n (i) AS (SELECT 1 UNION all SELECT i + 1 FROM n WHERE i < 1000)
select 
    CONCAT('022f818848e938b6b988fda7b3cab31a', i), -- MD5(CONCAT('evidencia-', i)),
    CONCAT('uploads/evidencias/evidencia_', i, '.pdf'),
    'application/pdf',
    DATE_ADD('2025-01-01 08:00:00', INTERVAL i HOUR)
FROM n;

INSERT INTO Evidencias(hash_arquivo, url_armazenamento, tipo_mime, data_upload) VALUES
('f10e2821bbbea527ea02200352313bc059445190', 'https://www.4devs.com.br/codificar_sha1', '.html', '2022-04-22 03:42:56');

INSERT IGNORE INTO Disputas (protocolo_disputa, motivo, relatorio_comprador, data_abertura, status, veredito, evidencia, moderador)
WITH RECURSIVE n (i) AS (SELECT 1 UNION all SELECT i + 1 FROM n WHERE i < 1000)
select 
 CONCAT('DSP-', LPAD(i, 9, '0')),
    ELT(
        1 + (i % 3),
        'DEFEITO_FUNCIONAL',
        'DANO_TRANSPORTE',
        'ITEM_DIVERGENTE'
    ),
    CONCAT('Relatorio do comprador referente a disputa ', i),
    DATE_ADD('2025-01-01 08:00:00', INTERVAL i HOUR),
    ELT(
        1 + (i % 4),
        'ABERTA',
        'EM_ANALISE',
        'AGUARDANDO_PROVAS',
        'ENCERRADA'
    ),
    CASE
        WHEN i % 4 = 4 THEN
            ELT(1 + (i % 2), 'FAVORAVEL_COMPRADOR', 'FAVORAVEL_VENDEDOR')
        ELSE 'PENDENTE'
    END,
    'f10e2821bbbea527ea02200352313bc059445190',
    i
FROM n;

INSERT IGNORE INTO Envios (codigo_rastreamento, transportadora, data_despacho, data_entrega_efetiva)
WITH RECURSIVE n (i) AS (
    SELECT 1
    UNION ALL
    SELECT i + 1 FROM n WHERE i < 1000
)
SELECT CONCAT('TRK', LPAD(i, 8, '0')),
       ELT(1 + i % 4, 'Correios', 'Jadlog', 'Loggi', 'Total Express'),
       DATE_ADD('2025-01-01 10:00:00', INTERVAL i HOUR),
       DATE_ADD('2025-01-01 10:00:00', INTERVAL (i + 72) HOUR)
FROM n;

INSERT IGNORE INTO ContasCustodia (montante_pedido, status)
WITH RECURSIVE n (i) AS (
    SELECT 1
    UNION ALL
    SELECT i + 1 FROM n WHERE i < 1000
)
SELECT i,
       ELT(1 + i % 4, 'RETIRADA', 'CONGELADA_DISPUTA',
           'LIQUIDA_VENDEDOR', 'ESTORNADA_COMPRADOR')
FROM n;

INSERT IGNORE INTO Categorias (slug_categoria, nome, descricao)
WITH RECURSIVE n (i) AS (
    SELECT 1
    UNION ALL
    SELECT i + 1 FROM n WHERE i < 1000
)
SELECT CONCAT('categoria-', i),
       CONCAT('Categoria ', i),
       CONCAT('Descricao da categoria ', i)
FROM n;

INSERT IGNORE INTO ModelosHardware
(fabricante, linha_modelo, especificacao_tecnica, preco_mediano_historico, categoria)
WITH RECURSIVE n (i) AS (
    SELECT 1
    UNION ALL
    SELECT i + 1 FROM n WHERE i < 1000
)
SELECT ELT(1 + i % 5, 'Intel', 'AMD', 'NVIDIA', 'ASUS', 'Corsair'),
       CONCAT('Modelo Carga ', i),
       CONCAT('Especificacao tecnica do modelo ', i),
       100.00 + i,
       CONCAT('categoria-', i)
FROM n;

INSERT IGNORE INTO Anuncios (codigo_anuncio, vendedor, titulo, preco_venda, aliquota_taxa_aplicada,
 valor_taxa_plataforma, valor_liquido_vendedor, estado_item, status, id_parte)
WITH RECURSIVE n (i) AS (
    SELECT 1
    UNION ALL
    SELECT i + 1 FROM n WHERE i < 1000
)
SELECT CONCAT('ANU', LPAD(i, 6, '0')),
       i,
       CONCAT('Anuncio de hardware ', i),
       500.00 + i,
       5.00,
       (500.00 + i) * 0.05,
       (500.00 + i) * 0.95,
       ELT(1 + i % 4, 'NOVO', 'USADO_EXCELENTE', 'USADO_BOM', 'USADO_DEFEITO'),
       ELT(1 + i % 4, 'RASCUNHO', 'ATIVO', 'PAUSADO', 'VENDIDO'),
       FLOOR(RAND()*(200-1+1)+5)  -- i
FROM n

INSERT IGNORE INTO Pedidos (data_hora_criacao, valor_total_transacao, status_pedido,
 data_limite_homologacao, comprador, anuncio, disputa, Envio, Conta)
WITH RECURSIVE n (i) AS (
    SELECT 1
    UNION ALL
    SELECT i + 1 FROM n WHERE i < 500
)
SELECT DATE_ADD('2025-01-01 10:00:00', INTERVAL i HOUR),
       500.00 + i,
       ELT(1 + i % 6,
           'AGUARDANDO_ENVIO',
           'ENVIADO',
           'ENTREGUE',
           'EM_DISPUTA',
           'CONCLUIDO',
           'CANCELADO'),
       DATE_ADD('2025-01-01 10:00:00', INTERVAL (i + 168) HOUR),
       i,
       CONCAT('ANU', LPAD(i, 6, '0')),
       CONCAT('DSP-', LPAD(i, 9, '0')),
       CONCAT('TRK', LPAD(i, 8, '0')),
       '13'
FROM n











-- Um perfil (biografia) para cada estudante da massa
INSERT IGNORE INTO perfil (fk_email_estudante, tres_gostos, frase_marcante, mood_atual, funfact)
WITH RECURSIVE n (i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
SELECT CONCAT('carga', i, '@edu.unirio.br'),
       'Estudar, Ler, Correr', 'Frase de teste de carga', 'Testando o Unilink', CONCAT('Sou o estudante ', i)
FROM n;

-- 50 eventos futuros (todos aceitam confirmacao de presenca)
INSERT INTO evento (fk_email_organizador, nome_evento, data_hora_evento, local_campus, qtd_confirmados)
WITH RECURSIVE n (i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 50)
SELECT CONCAT('carga', i, '@edu.unirio.br'),
       CONCAT('Evento de carga ', i),
       TIMESTAMP '2027-01-01 18:00:00' + INTERVAL i DAY,
       ELT(1 + i % 2, 'CCET - Auditório', 'Campus Pasteur - CCH'),
       0
FROM n
WHERE NOT EXISTS (SELECT 1 FROM evento WHERE nome_evento LIKE 'Evento de carga %');

SELECT (SELECT COUNT(*) FROM estudante) AS estudantes, (SELECT COUNT(*) FROM evento) AS eventos;