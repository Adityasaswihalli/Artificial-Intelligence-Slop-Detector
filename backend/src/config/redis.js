const redis = require('redis-mock');
const { promisify } = require('util');

let client;

const connectRedis = async () => {
  client = redis.createClient();
  
  // Wrap core functions to work like Redis V4
  const originalGet = client.get.bind(client);
  const originalSetEx = client.setex.bind(client);
  const originalDel = client.del.bind(client);
  const originalIncr = client.incr.bind(client);

  client.get = promisify(originalGet);
  client.setEx = promisify(originalSetEx);
  client.del = promisify(originalDel);
  client.incr = promisify(originalIncr);

  console.log('📦 Using Local In-Memory Redis Mock');
  return client;
};

const getClient = () => {
  if (!client) throw new Error('Redis not initialized');
  return client;
};

module.exports = { connectRedis, getClient };
