import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { channelTable, familyStorageConfigured, safeText, statusTable, tokenMatches } from '../storage.js';

export async function familyRevoke(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  if (!familyStorageConfigured()) {
    return { status: 503, jsonBody: { ok: false, configurationRequired: true } };
  }

  const body = await request.json().catch(() => ({})) as { familyId?: unknown; writeToken?: unknown };
  const familyId = safeText(body.familyId, 64);
  const writeToken = safeText(body.writeToken, 128);

  if (!familyId || !writeToken) {
    return { status: 400, jsonBody: { ok: false, message: 'Missing Family Link credentials.' } };
  }

  const channels = await channelTable();
  try {
    const channel = await channels.getEntity<{ writeTokenHash: string }>('channel', familyId);
    if (!tokenMatches(writeToken, String(channel.writeTokenHash || ''))) {
      return { status: 403, jsonBody: { ok: false, message: 'Invalid Family Link credentials.' } };
    }
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) return { status: 404, jsonBody: { ok: false, message: 'Family Link not found.' } };
    throw error;
  }

  const statuses = await statusTable();
  try {
    await statuses.deleteEntity('status', familyId);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== 404) throw error;
  }

  await channels.deleteEntity('channel', familyId);
  return { status: 200, jsonBody: { ok: true } };
}

app.http('familyRevoke', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'family/link',
  handler: familyRevoke,
});
