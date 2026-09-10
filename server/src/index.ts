import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { eventRoutes } from './routes/events.routes';

// Ajouter après les configurations de validator/serializer


const fastify = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(cors, { origin: true });
fastify.register(eventRoutes)


const start = async () => {
 try {
 await fastify.listen({ port: 3001, host: '0.0.0.0' });
 console.log('Serveur Fastify démarré sur http://localhost:3001');
 } catch (err) {
 fastify.log.error(err);
 process.exit(1);
 }
};
start();
