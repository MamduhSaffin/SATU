import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { channelTable, familyStorageConfigured, hashToken, randomId } from '../storage.js';

export async function familyPair(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  if (!familyStorageConfigured()) {
    return { status: 503, jsonBody: { ok: false, configurationRequired: true, message: 'Family cloud storage is not configured.' } };
  }

  const familyId = randomId(12);
  const writeToken = randomId(24);
  const viewerToken = randomId(24);
  const table = await channelTable();

  await table.createEntity({
    partitionKey: 'channel',
    rowKey: familyId,
    writeTokenHash: hashToken(writeToken),
    viewerTokenHash: hashToken(viewerToken),
    createdAt: Date.now(),
  });

  return {
    status: 201,
    jsonBody: {
      ok: true,
      familyId,
      writeToken,
      viewerToken,
    },
  };
}

app.http('familyPair', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'family/pair',
  handler: familyPair,
});
