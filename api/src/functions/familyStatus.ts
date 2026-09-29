import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { channelTable, familyStorageConfigured, safeText, statusTable, tokenMatches } from '../storage.js';

export async function familyStatus(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  if (!familyStorageConfigured()) {
    return { status: 503, jsonBody: { ok: false, configurationRequired: true } };
  }

  const familyId = safeText(request.query.get('family'), 64);
  const viewerToken = safeText(request.query.get('token'), 128);
  if (!familyId || !viewerToken) {
    return { status: 400, jsonBody: { ok: false, message: 'Missing Family Link credentials.' } };
  }

  try {
    const channels = await channelTable();
    const channel = await channels.getEntity<{ viewerTokenHash: string }>('channel', familyId);
    if (!tokenMatches(viewerToken, String(channel.viewerTokenHash || ''))) {
      return { status: 403, jsonBody: { ok: false, message: 'Invalid Family Link credentials.' } };
    }
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) return { status: 404, jsonBody: { ok: false, message: 'Family Link not found.' } };
    throw error;
  }

  try {
    const statuses = await statusTable();
    const entity = await statuses.getEntity<Record<string, unknown>>('status', familyId);
    return {
      status: 200,
      jsonBody: {
        ok: true,
        latest: {
          id: String(entity.checkInId || ''),
          status: String(entity.status || ''),
          label: String(entity.label || ''),
          createdAt: Number(entity.createdAt || 0),
          pilgrimName: String(entity.pilgrimName || ''),
          hotelName: String(entity.hotelName || ''),
          groupCode: String(entity.groupCode || ''),
          busNumber: String(entity.busNumber || ''),
        },
      },
    };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) return { status: 200, jsonBody: { ok: true, latest: null } };
    throw error;
  }
}

app.http('familyStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'family/status',
  handler: familyStatus,
});
