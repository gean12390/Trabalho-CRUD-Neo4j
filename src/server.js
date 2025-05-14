const express = require('express');
const driver = require('./db');
const path = require('path');


const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));


const getSession = () => driver.session();

// Criar grafo "Usuarios" ao iniciar o servidor
(async () => {
  const session = getSession();
  try {
    await session.run(
      'MERGE (:Grafo {nome: $nome})',
      { nome: 'Usuarios' }
    );
    console.log('Grafo "Usuarios" pronto.');
  } catch (err) {
    console.error('Erro ao criar grafo:', err);
  } finally {
    await session.close();
  }
})();

// Criar usuário com verificação de e-mail duplicado
app.post('/usuarios', async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  const session = getSession();

  try {
    // Verifica se o e-mail já existe
    const check = await session.run(
      'MATCH (u:Usuario {email: $email}) RETURN u',
      { email }
    );

    if (check.records.length > 0) {
      return res.status(409).json({ error: 'Já existe um usuário com esse e-mail' });
    }

    // Cria o usuário e relacionamento com o grafo
    await session.run(
      `
        MATCH (g:Grafo {nome: $grafo})
        CREATE (u:Usuario {nome: $nome, email: $email})
        CREATE (u)-[:PERTENCE]->(g)
        RETURN u
      `,
      { nome, email, grafo: 'Usuarios' }
    );

    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro ao criar usuário', details: err.message });
  } finally {
    await session.close();
  }
});

// Listar usuários
app.get('/usuarios', async (req, res) => {
  const session = getSession();

  try {
    const result = await session.run('MATCH (u:Usuario) RETURN u');
    const usuarios = result.records.map(r => r.get('u').properties);
    res.json(usuarios);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao listar usuários', details: err.message });
  } finally {
    await session.close();
  }
});

// Atualizar nome do usuário
app.put('/usuarios/:email', async (req, res) => {
  const { nome } = req.body;
  const { email } = req.params;

  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório para atualização' });
  }

  const session = getSession();

  try {
    const result = await session.run(
      'MATCH (u:Usuario {email: $email}) SET u.nome = $nome RETURN u',
      { email, nome }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro ao atualizar usuário', details: err.message });
  } finally {
    await session.close();
  }
});

// Deletar usuário
app.delete('/usuarios/:email', async (req, res) => {
  const { email } = req.params;

  const session = getSession();

  try {
    const result = await session.run(
      'MATCH (u:Usuario {email: $email}) DETACH DELETE u',
      { email }
    );

    if (result.summary.counters.nodesDeleted === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro ao deletar usuário', details: err.message });
  } finally {
    await session.close();
  }
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
