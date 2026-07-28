import 'dotenv/config';
import Fastify from 'fastify';

const app = Fastify({
  logger: true,
});

app.get('/health', async (_request, _reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen({ port, host });
    console.log(`API server listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
