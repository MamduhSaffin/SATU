import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { channelTable, familyStorageConfigured, safeText, statusTable, tokenMatches } from '../storage.js';

const ALLOWED = new Set(['safe', 'with-group', 'at-hotel', 'need-contact']);

type Body = {
  familyId?: string;
  writeToken?: string;
  checkIn?: {
    id?: string;
    status?: string;
    label?: string;
    createdAt?: number;
    pilgrimName?: string;
    hotelName?: string;
    groupCode?: string;
    busNumber?: string;
  };
};

export async function familyCheckIn(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  if (!familyStorageConfigured()) {
    return { status: 503, jsonBody: { ok: false, configurationRequired: true } };
  }

  const body = await request.json() as Body;
  const familyId = safeText(body.familyId, 64);
  const writeToken = safeText(body.writeToken, 128);
  const checkIn = body.checkIn;

  if (!familyId || !writeToken || !checkIn || !ALLOWED.has(checkIn.status || '')) {
    return { status: 400, jsonBody: { ok: false, message: 'Invalid check-in payload.' } };
  }

  try {
    const channels = await channelTable();
    const channel = await channels.getEntity<{ writeTokenHash: string }>('channel', familyId);
    if (!tokenMatches(writeToken, String(channel.writeTokenHash || ''))) {
      return { status: 403, jsonBody: { ok: false, message: 'Invalid Family Link credentials.' } };
    }
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) return { status: 404, jsonBody: { ok: false, message: 'Family Link not found.' } };
    throw error;
  }

  const createdAt = Number.isFinite(checkIn.createdAt) ? Number(checkIn.createdAt) : Date.now();
  const statuses = await statusTable();
  await statuses.upsertEntity({
    partitionKey: 'status',
    rowKey: familyId,
    checkInId: safeText(checkIn.id, 80),
    status: safeText(checkIn.status, 40),
    label: safeText(checkIn.label, 120),
    createdAt,
    pilgrimName: safeText(checkIn.pilgrimName, 120),
    hotelName: safeText(checkIn.hotelName, 160),
    groupCode: safeText(checkIn.groupCode, 80),
    busNumber: safeText(checkIn.busNumber, 80),
    updatedAt: Date.now(),
  }, 'Replace');

  return { status: 200, jsonBody: { ok: true, syncedAt: Date.now() } };
}

app.http('familyCheckIn', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'family/checkin',
  handler: familyCheckIn,
});
