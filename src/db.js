const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', '12345678')
);

// Usando o driver para obter a sessão no momento de fazer as requisições
module.exports = driver;
