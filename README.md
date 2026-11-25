# SENKY 2.0

Gerador de treinos. Node 20+ e SQL Server (banco SENKY).

## O que mudou em relação à 1.0

1. **Exercícios vêm do banco.** Nada mais fixo no código: exercícios, séries, repetições e descanso saem das tabelas `exercicios` e `esquemas`.
2. **Tela de cadastro de exercícios** (`/exercicios.html`, só administradores), com vínculo ao esquema (um ou mais) e ao grupamento e músculo.
3. **Filtro em dois níveis** no assistente de treino: objetivo, grupamento, músculo específico. Em cada grupamento, "Todos" ou músculos escolhidos; só aparecem músculos que têm exercício no objetivo escolhido.
4. **Ilustração animada do corpo** na etapa de músculos (frente e costas): ao passar o mouse, tocar ou marcar um músculo, ele acende no desenho e aparece uma explicação simples de onde fica e para que serve. Também dá para tocar direto no desenho para marcar o músculo.

O projeto também foi reorganizado: back-end em `src/` (conexão, middlewares e rotas separados), um CSS base compartilhado e um CSS próprio por tela.

## Estrutura

```
server.js                 servidor, sessão e páginas protegidas
src/db.js                 conexão com o SQL Server (pool único)
src/util.js               validação e montagem segura de consultas
src/middleware/auth.js    login obrigatório e checagem de administrador
src/routes/auth.js        cadastro, login, logout e /api/me
src/routes/treino.js      esquemas, grupamentos, músculos e montagem do treino
src/routes/exercicios.js  cadastro de exercício (administrador)
sql/01-migracao-2.0.sql   cria e ajusta as tabelas (pode rodar mais de uma vez)
views/                    telas protegidas: objetivo, treino, exercicios
public/                   login-cadastro.html, css/ e js/ (corpo.js e corpo.css: ilustração do corpo)
```

## Como colocar para rodar

1. **Banco:** faça backup e rode `sql/01-migracao-2.0.sql` no SSMS (banco SENKY). No fim ele lista os exercícios com músculo e esquemas, para conferência. Se aparecer erro em vermelho, pare e leia a mensagem.
2. **Administrador:** no SSMS, execute com o seu e-mail:
   `UPDATE dbo.clientes SET IS_ADMIN = 1 WHERE EMAIL = 'seu@email.com';`
3. **Configuração:** copie `.env.example` para `.env` e preencha (servidor, usuário `svc_senky_web`, senha e `SESSION_SECRET`).
4. **Instalar e subir:**
   ```
   npm install
   npm start
   ```
   Abra http://localhost:3000

## Observações

- Contas já cadastradas continuam valendo se a senha foi guardada com bcrypt (a 1.0 usava `bcryptjs`). Se algum login antigo falhar, crie a conta de novo.
- O script SQL supõe que o ID de `exercicios` é auto-incremento e que os 19 exercícios originais existem com os mesmos nomes. Se não, ele para e explica o que verificar.
- Sessões ficam em memória: reiniciar o servidor desloga todo mundo (suficiente para desenvolvimento).
- Trapézio e Lombar só aparecem no filtro depois que houver exercícios cadastrados para eles.
- A ilustração reconhece os músculos pelo nome cadastrado na tabela `musculos`. Um músculo novo com outro nome continua funcionando nos cartões, mas não acende nada no desenho até ganhar uma zona em `public/js/corpo.js`.
