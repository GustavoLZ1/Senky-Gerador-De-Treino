/* =====================================================================
   SENKY - migracao
   Cria:   grupamentos, musculos, exercicio_esquema
   Altera: esquemas (ganha ID), exercicios (ganha MUSCULO_ID), clientes (ganha IS_ADMIN)

   Como usar: abra no SSMS, confira que o banco e o SENKY e execute (F5).
   Faca um backup antes. Pode ser executado mais de uma vez.
   Se aparecer alguma mensagem em vermelho, pare e me envie o texto dela.
   ===================================================================== */
USE SENKY;
GO

/* 1) esquemas ganha um ID (hoje so tem OBJETIVO, SERIES, REPETICOES, DESCANSO) */
IF COL_LENGTH('dbo.esquemas', 'ID') IS NULL
    ALTER TABLE dbo.esquemas ADD ID INT IDENTITY(1,1) NOT NULL;
GO
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID('dbo.esquemas') AND i.is_unique = 1
      AND INDEX_COL('dbo.esquemas', i.index_id, 1) = 'ID'
      AND INDEX_COL('dbo.esquemas', i.index_id, 2) IS NULL)
    ALTER TABLE dbo.esquemas ADD CONSTRAINT UQ_esquemas_id UNIQUE (ID);
GO

/* 2) grupamentos: os IDs sao descobertos a partir dos exercicios que ja existem */
IF OBJECT_ID('dbo.grupamentos', 'U') IS NOT NULL AND COL_LENGTH('dbo.grupamentos', 'CHAVE') IS NULL
    THROW 50001, 'A tabela grupamentos ja existe com outro formato. Envie o resultado de SELECT * FROM grupamentos.', 1;
GO
IF OBJECT_ID('dbo.grupamentos', 'U') IS NULL
BEGIN
    BEGIN TRANSACTION;

    CREATE TABLE dbo.grupamentos (
        ID    INT          NOT NULL CONSTRAINT PK_grupamentos PRIMARY KEY,
        CHAVE VARCHAR(30)  NOT NULL CONSTRAINT UQ_grupamentos_chave UNIQUE,
        NOME  NVARCHAR(40) NOT NULL
    );

    DECLARE @ref TABLE (CHAVE VARCHAR(30), NOME NVARCHAR(40), EXEMPLO NVARCHAR(100));
    INSERT @ref VALUES
        ('costas',  N'Costas',  N'Puxada frontal'),
        ('peito',   N'Peito',   N'Supino reto'),
        ('ombro',   N'Ombro',   N'Elevação lateral'),
        ('pernas',  N'Pernas',  N'Agachamento livre'),
        ('biceps',  N'Bíceps',  N'Rosca direta'),
        ('triceps', N'Tríceps', N'Tríceps testa');

    INSERT dbo.grupamentos (ID, CHAVE, NOME)
    SELECT DISTINCT e.GRUPAMENTO_ID, r.CHAVE, r.NOME
    FROM @ref r
    JOIN dbo.exercicios e ON e.NOME = r.EXEMPLO;

    IF (SELECT COUNT(*) FROM dbo.grupamentos) <> 6
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50002, 'Nao encontrei os exercicios de exemplo em dbo.exercicios. Envie o resultado de SELECT * FROM exercicios.', 1;
    END

    COMMIT TRANSACTION;
END
GO

/* 3) musculos (segundo nivel do filtro) */
IF OBJECT_ID('dbo.musculos', 'U') IS NULL
    CREATE TABLE dbo.musculos (
        ID            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_musculos PRIMARY KEY,
        GRUPAMENTO_ID INT           NOT NULL CONSTRAINT FK_musculos_grupamento REFERENCES dbo.grupamentos (ID),
        NOME          NVARCHAR(60)  NOT NULL,
        CONSTRAINT UQ_musculos UNIQUE (GRUPAMENTO_ID, NOME)
    );
GO
IF NOT EXISTS (SELECT 1 FROM dbo.musculos)
BEGIN
    DECLARE @m TABLE (CHAVE VARCHAR(30), NOME NVARCHAR(60));
    INSERT @m VALUES
        ('costas',  N'Grande dorsal'), ('costas', N'Trapézio'), ('costas', N'Romboides'), ('costas', N'Lombar'),
        ('peito',   N'Peitoral superior'), ('peito', N'Peitoral médio'), ('peito', N'Peitoral inferior'),
        ('ombro',   N'Deltoide anterior'), ('ombro', N'Deltoide lateral'), ('ombro', N'Deltoide posterior'),
        ('pernas',  N'Quadríceps'), ('pernas', N'Posteriores de coxa'), ('pernas', N'Glúteos'), ('pernas', N'Panturrilhas'),
        ('biceps',  N'Bíceps braquial'), ('biceps', N'Braquial e braquiorradial'),
        ('triceps', N'Cabeça longa'), ('triceps', N'Cabeça lateral e medial');

    INSERT dbo.musculos (GRUPAMENTO_ID, NOME)
    SELECT g.ID, m.NOME
    FROM @m m
    JOIN dbo.grupamentos g ON g.CHAVE = m.CHAVE;
END
GO

/* 4) exercicios ganha MUSCULO_ID (pode ficar vazio) */
IF COL_LENGTH('dbo.exercicios', 'MUSCULO_ID') IS NULL
    ALTER TABLE dbo.exercicios ADD MUSCULO_ID INT NULL
        CONSTRAINT FK_exercicios_musculo REFERENCES dbo.musculos (ID);
GO

/* 5) musculo de cada exercicio que ja existe (so preenche onde esta vazio) */
DECLARE @e TABLE (EXERCICIO NVARCHAR(100), MUSCULO NVARCHAR(60));
INSERT @e VALUES
    (N'Puxada frontal', N'Grande dorsal'),
    (N'Remada curvada', N'Grande dorsal'),
    (N'Remada baixa no cabo', N'Romboides'),
    (N'Supino reto', N'Peitoral médio'),
    (N'Supino inclinado com halteres', N'Peitoral superior'),
    (N'Crucifixo na máquina', N'Peitoral médio'),
    (N'Desenvolvimento com halteres', N'Deltoide anterior'),
    (N'Elevação lateral', N'Deltoide lateral'),
    (N'Crucifixo inverso', N'Deltoide posterior'),
    (N'Agachamento livre', N'Quadríceps'),
    (N'Leg press 45°', N'Quadríceps'),
    (N'Cadeira extensora', N'Quadríceps'),
    (N'Mesa flexora', N'Posteriores de coxa'),
    (N'Rosca direta', N'Bíceps braquial'),
    (N'Rosca alternada com halteres', N'Bíceps braquial'),
    (N'Rosca martelo', N'Braquial e braquiorradial'),
    (N'Tríceps testa', N'Cabeça longa'),
    (N'Tríceps na polia com corda', N'Cabeça lateral e medial'),
    (N'Tríceps francês', N'Cabeça longa');

UPDATE ex SET MUSCULO_ID = mu.ID
FROM dbo.exercicios ex
JOIN @e e ON e.EXERCICIO = ex.NOME
JOIN dbo.musculos mu ON mu.NOME = e.MUSCULO AND mu.GRUPAMENTO_ID = ex.GRUPAMENTO_ID
WHERE ex.MUSCULO_ID IS NULL;
GO

/* 6) vinculo exercicio x esquema */
IF OBJECT_ID('dbo.exercicio_esquema', 'U') IS NULL
    CREATE TABLE dbo.exercicio_esquema (
        EXERCICIO_ID INT NOT NULL CONSTRAINT FK_ee_exercicio REFERENCES dbo.exercicios (ID) ON DELETE CASCADE,
        ESQUEMA_ID   INT NOT NULL CONSTRAINT FK_ee_esquema   REFERENCES dbo.esquemas (ID),
        CONSTRAINT PK_exercicio_esquema PRIMARY KEY (EXERCICIO_ID, ESQUEMA_ID)
    );
GO
/* Primeira carga: todo exercicio entra em todos os esquemas, como e hoje. */
IF NOT EXISTS (SELECT 1 FROM dbo.exercicio_esquema)
    INSERT dbo.exercicio_esquema (EXERCICIO_ID, ESQUEMA_ID)
    SELECT ex.ID, es.ID
    FROM dbo.exercicios ex
    CROSS JOIN dbo.esquemas es;
GO

/* 7) quem pode cadastrar exercicios */
IF COL_LENGTH('dbo.clientes', 'IS_ADMIN') IS NULL
    ALTER TABLE dbo.clientes ADD IS_ADMIN BIT NOT NULL CONSTRAINT DF_clientes_is_admin DEFAULT 0;
GO
/* Troque pelo seu e-mail e execute esta linha (tire os comentarios):
UPDATE dbo.clientes SET IS_ADMIN = 1 WHERE EMAIL = 'seu@email.com';
*/

/* 8) permissoes do usuario de servico da aplicacao */
GRANT SELECT ON dbo.esquemas           TO svc_senky_web;
GRANT SELECT ON dbo.grupamentos        TO svc_senky_web;
GRANT SELECT ON dbo.musculos           TO svc_senky_web;
GRANT SELECT ON dbo.exercicios         TO svc_senky_web;
GRANT SELECT ON dbo.exercicio_esquema  TO svc_senky_web;
GRANT INSERT ON dbo.exercicios         TO svc_senky_web;
GRANT INSERT ON dbo.exercicio_esquema  TO svc_senky_web;
GO

/* 9) conferencia: cada exercicio com seu musculo e em quantos esquemas entra */
SELECT g.CHAVE AS GRUPO, mu.NOME AS MUSCULO, e.NOME AS EXERCICIO,
       (SELECT COUNT(*) FROM dbo.exercicio_esquema x WHERE x.EXERCICIO_ID = e.ID) AS ESQUEMAS
FROM dbo.exercicios e
JOIN dbo.grupamentos g ON g.ID = e.GRUPAMENTO_ID
LEFT JOIN dbo.musculos mu ON mu.ID = e.MUSCULO_ID
ORDER BY g.ID, e.ORDEM;
GO
