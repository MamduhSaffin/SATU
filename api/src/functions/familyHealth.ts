import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { familyStorageConfigured } from '../storage.js';

export async function familyHealth(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: {
      ok: true,
      storageConfigured: familyStorageConfigured(),
      liveTracking: false,
      service: 'TEMAN Family Link',
    },
  };
}

app.http('familyHealth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'family/health',
  handler: familyHealth,
});
