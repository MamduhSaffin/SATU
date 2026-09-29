import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { TableClient, TableServiceClient } from '@azure/data-tables';

const CHANNEL_TABLE = 'TemanFamilyChannels';
const STATUS_TABLE = 'TemanFamilyStatus';

function connectionString(): string | undefined {
  return process.env.TEMAN_FAMILY_STORAGE_CONNECTION_STRING?.trim() || undefined;
}

export function familyStorageConfigured(): boolean {
  return Boolean(connectionString());
}

async function ensureTable(name: string): Promise<TableClient> {
  const value = connectionString();
  if (!value) throw new Error('TEMAN Family storage is not configured');
  const service = TableServiceClient.fromConnectionString(value);
  try {
    await service.createTable(name);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== 409) throw error;
  }
  return TableClient.fromConnectionString(value, name);
}

export async function channelTable(): Promise<TableClient> {
  return ensureTable(CHANNEL_TABLE);
}

export async function statusTable(): Promise<TableClient> {
  return ensureTable(STATUS_TABLE);
}

export function randomId(bytes = 12): string {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function tokenMatches(value: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(value), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function safeText(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
