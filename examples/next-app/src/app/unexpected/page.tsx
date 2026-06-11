import { connection } from 'next/server';

export default async function UnexpectedPage(): Promise<never> {
  await connection();
  throw new Error('SENSITIVE_DATABASE_CONNECTION_STRING');
}
