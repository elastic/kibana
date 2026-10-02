/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServiceMock,
  httpServerMock,
  coreMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { registerPersistReportFieldsRoute } from './persist_report_fields';
import { registerIngestThreatReportRoute } from './ingest_threat_report';
import { registerAttributeAlertsEvidenceRoute } from './attribute_alerts_evidence';
import {
  ATTRIBUTE_ALERTS_EVIDENCE_API_PATH,
  INGEST_THREAT_REPORT_API_PATH,
  PERSIST_REPORT_FIELDS_API_PATH,
  THREAT_REPORTS_INDEX,
  persistReportFieldsBodySchema,
} from '../../../common/threat_intel';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';

/**
 * Handler-level tests for the three threat-report write routes. These writes run as the internal
 * user, so Elasticsearch no longer checks them and the route is the only thing standing between a
 * caller holding the route's (per-space) privilege and every space's reports. That boundary is
 * invisible to the services' own unit tests, which are handed a mock client and a `spaceId` the
 * route decided on: they can only assert the write that was asked for, never whether the route
 * should have asked for it.
 */
describe('threat report write routes', () => {
  const logger = loggingSystemMock.createLogger();

  const buildDeps = ({
    spaceId,
    bootstrapReady = true,
  }: { spaceId?: string; bootstrapReady?: boolean } = {}) => {
    const router = httpServiceMock.createRouter();
    const getSpacesService = jest
      .fn()
      .mockReturnValue(spaceId ? { getSpaceId: () => spaceId } : undefined);
    const getBootstrapReady = bootstrapReady
      ? jest.fn().mockResolvedValue(undefined)
      : jest.fn().mockRejectedValue(new Error('template install failed'));
    return { router, logger, getSpacesService, getBootstrapReady };
  };

  const getHandler = (
    router: ReturnType<typeof httpServiceMock.createRouter>,
    path: string
  ): ((context: unknown, request: unknown, response: unknown) => Promise<unknown>) => {
    const route = router.versioned.getRoute('post', path);
    return Object.values(route.versions)[0].handler as never;
  };

  /**
   * `httpServerMock.createResponseFactory()` hands back mocks that return `undefined`, so a
   * handler that bails with `return response.customError(...)` is indistinguishable from one that
   * fell through to the write -- which is exactly what these tests are checking. Give the factory
   * methods a value back, as the real one does, so an early return actually returns.
   */
  const buildResponse = () => {
    const response = httpServerMock.createResponseFactory();
    response.customError.mockReturnValue({ status: 503 } as never);
    response.badRequest.mockReturnValue({ status: 400 } as never);
    response.notFound.mockReturnValue({ status: 404 } as never);
    return response;
  };

  const buildContext = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const context = coreMock.createRequestHandlerContext();
    context.elasticsearch.client.asInternalUser = esClient;
    return { core: Promise.resolve(context), esClient };
  };

  // One visible hit: what the space-filtered visibility search returns for a report the caller
  // may reach. `_source: false`, so only the id comes back.
  const visibleReport = {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { max_score: null, hits: [{ _index: THREAT_REPORTS_INDEX, _id: 'report-1' }] },
  };
  const noVisibleReport = { ...visibleReport, hits: { max_score: null, hits: [] } };

  describe('registerPersistReportFieldsRoute', () => {
    const validBody = {
      index: THREAT_REPORTS_INDEX,
      id: 'report-1',
      doc: { severity: { level: 'high' }, rank_score: 7.5 },
    };

    it('declares the write authz on the route config', () => {
      const { router, ...rest } = buildDeps();
      registerPersistReportFieldsRoute({ router, ...rest } as never);

      const [routeConfig] = router.versioned.post.mock.calls[0];
      expect(routeConfig.security?.authz).toBe(THREAT_INTEL_WRITE_AUTHZ);
    });

    it('returns 503 when bootstrap has not resolved', async () => {
      const { router, ...rest } = buildDeps({ bootstrapReady: false });
      registerPersistReportFieldsRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      const response = buildResponse();

      await getHandler(router, PERSIST_REPORT_FIELDS_API_PATH)(
        { core },
        httpServerMock.createKibanaRequest({ body: validBody }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
      expect(esClient.update).not.toHaveBeenCalled();
    });

    it('merges the enrichment doc as the internal user', async () => {
      const { router, ...rest } = buildDeps();
      registerPersistReportFieldsRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      const response = buildResponse();

      await getHandler(router, PERSIST_REPORT_FIELDS_API_PATH)(
        { core },
        httpServerMock.createKibanaRequest({ body: validBody }),
        response
      );

      expect(esClient.update).toHaveBeenCalledWith({
        index: THREAT_REPORTS_INDEX,
        id: 'report-1',
        doc: validBody.doc,
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
    });

    it('returns 500 when the merge fails', async () => {
      const { router, ...rest } = buildDeps();
      registerPersistReportFieldsRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      esClient.update.mockRejectedValue(new Error('version conflict'));
      const response = buildResponse();

      await getHandler(router, PERSIST_REPORT_FIELDS_API_PATH)(
        { core },
        httpServerMock.createKibanaRequest({ body: validBody }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });

    /**
     * The section allowlist is this route's only limit on what it will write, since enrichment is
     * space-blind and the route therefore cannot scope the write to the request's space. Each
     * rejection below is a write the route would otherwise have applied to a report in any space.
     */
    describe('doc allowlist', () => {
      const validate = (doc: Record<string, unknown>) =>
        persistReportFieldsBodySchema.validate({
          index: THREAT_REPORTS_INDEX,
          id: 'report-1',
          doc,
        });

      it.each([
        ['extracted', { extracted: { iocs: [{ type: 'ipv4', value: '1.2.3.4' }] } }],
        ['geography', { geography: { regions: ['EU'] } }],
        ['lineage', { lineage: { extraction_method: 'workflow_v4' } }],
        ['severity', { severity: { level: 'high', score: 8 } }],
        ['rank_score', { rank_score: 6.4 }],
      ])('accepts the %s section the enrichment steps write', (_name, doc) => {
        expect(() => validate(doc)).not.toThrow();
      });

      // A merge-patch replaces arrays wholesale, so this single field would erase every space's
      // hunt and alert-attribution evidence, not just the caller's.
      it('rejects evidence, which a merge would replace rather than extend', () => {
        expect(() => validate({ evidence: [] })).toThrow(/evidence/);
      });

      it('rejects space_id, which would re-home the report', () => {
        expect(() => validate({ space_id: 'other-space' })).toThrow(/space_id/);
      });

      it('rejects a section no enrichment step writes', () => {
        expect(() => validate({ content: { body_text: 'rewritten' } })).toThrow(/content/);
      });

      // Caught here as a 400 rather than silently merged into a report under the wrong path.
      it('rejects a misnested key', () => {
        expect(() => validate({ severity: { level: 'high' }, score: 8 })).toThrow(/score/);
      });
    });
  });

  describe('registerIngestThreatReportRoute', () => {
    const requestWith = (document: Record<string, unknown>) =>
      httpServerMock.createKibanaRequest({ body: { document } });

    it('declares the write authz on the route config', () => {
      const { router, ...rest } = buildDeps();
      registerIngestThreatReportRoute({ router, ...rest } as never);

      const [routeConfig] = router.versioned.post.mock.calls[0];
      expect(routeConfig.security?.authz).toBe(THREAT_INTEL_WRITE_AUTHZ);
    });

    it('returns 503 when bootstrap has not resolved', async () => {
      const { router, ...rest } = buildDeps({ bootstrapReady: false });
      registerIngestThreatReportRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      const response = buildResponse();

      await getHandler(router, INGEST_THREAT_REPORT_API_PATH)(
        { core },
        requestWith({ title: 'report' }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
      expect(esClient.index).not.toHaveBeenCalled();
    });

    // An unstamped report matches no space's read filter, so it would be written but unreachable.
    it('stamps the request space when the document carries none', async () => {
      const { router, ...rest } = buildDeps({ spaceId: 'space-a' });
      registerIngestThreatReportRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      esClient.index.mockResolvedValue({ _id: 'new-report' } as never);
      const response = buildResponse();

      await getHandler(router, INGEST_THREAT_REPORT_API_PATH)(
        { core },
        requestWith({ title: 'report' }),
        response
      );

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: { title: 'report', space_id: 'space-a' },
          op_type: 'create',
        })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { reportId: 'new-report' } });
    });

    // Feed ingestion runs unprefixed (resolving to `default`) and creates reports every space can
    // read, so the global sentinel has to stay accepted.
    it('keeps a global report global', async () => {
      const { router, ...rest } = buildDeps();
      registerIngestThreatReportRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      esClient.index.mockResolvedValue({ _id: 'new-report' } as never);
      const response = buildResponse();

      await getHandler(router, INGEST_THREAT_REPORT_API_PATH)(
        { core },
        requestWith({ title: 'report', space_id: '*' }),
        response
      );

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({ document: { title: 'report', space_id: '*' } })
      );
    });

    it('rejects a document aimed at another space, without writing', async () => {
      const { router, ...rest } = buildDeps({ spaceId: 'space-a' });
      registerIngestThreatReportRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      const response = buildResponse();

      await getHandler(router, INGEST_THREAT_REPORT_API_PATH)(
        { core },
        requestWith({ title: 'report', space_id: 'space-b' }),
        response
      );

      expect(response.badRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ message: expect.stringContaining('space-b') }),
        })
      );
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('returns 500 when the create fails', async () => {
      const { router, ...rest } = buildDeps();
      registerIngestThreatReportRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      esClient.index.mockRejectedValue(new Error('document already exists'));
      const response = buildResponse();

      await getHandler(router, INGEST_THREAT_REPORT_API_PATH)(
        { core },
        requestWith({ title: 'report' }),
        response
      );

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });

  describe('registerAttributeAlertsEvidenceRoute', () => {
    const body = {
      index: THREAT_REPORTS_INDEX,
      id: 'report-1',
      window: '7d',
      computedAt: '2026-10-01T00:00:00.000Z',
      iocMatchHits: 2,
      techniqueOverlapHits: 1,
      alertHitsTotal: 3,
    };

    it('declares the write authz on the route config', () => {
      const { router, ...rest } = buildDeps();
      registerAttributeAlertsEvidenceRoute({ router, ...rest } as never);

      const [routeConfig] = router.versioned.post.mock.calls[0];
      expect(routeConfig.security?.authz).toBe(THREAT_INTEL_WRITE_AUTHZ);
    });

    it('stamps the counts as the internal user when the report is visible', async () => {
      const { router, ...rest } = buildDeps({ spaceId: 'space-a' });
      registerAttributeAlertsEvidenceRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      esClient.search.mockResolvedValue(visibleReport as never);
      const response = buildResponse();

      await getHandler(router, ATTRIBUTE_ALERTS_EVIDENCE_API_PATH)(
        { core },
        httpServerMock.createKibanaRequest({ body }),
        response
      );

      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'report-1',
          script: expect.objectContaining({
            params: expect.objectContaining({ space_id: 'space-a', alert_hits_total: 3 }),
          }),
        })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
    });

    // The scripted update appends a new per-space element when none matches, so an id from another
    // space would otherwise get evidence stamped onto it.
    it('404s without writing when the report is not visible in the request space', async () => {
      const { router, ...rest } = buildDeps({ spaceId: 'space-a' });
      registerAttributeAlertsEvidenceRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      esClient.search.mockResolvedValue(noVisibleReport as never);
      const response = buildResponse();

      await getHandler(router, ATTRIBUTE_ALERTS_EVIDENCE_API_PATH)(
        { core },
        httpServerMock.createKibanaRequest({ body }),
        response
      );

      expect(response.notFound).toHaveBeenCalled();
      expect(esClient.update).not.toHaveBeenCalled();
    });

    it('checks visibility against the request space plus the global catalog', async () => {
      const { router, ...rest } = buildDeps({ spaceId: 'space-a' });
      registerAttributeAlertsEvidenceRoute({ router, ...rest } as never);
      const { core, esClient } = buildContext();
      esClient.search.mockResolvedValue(visibleReport as never);

      await getHandler(router, ATTRIBUTE_ALERTS_EVIDENCE_API_PATH)(
        { core },
        httpServerMock.createKibanaRequest({ body }),
        buildResponse()
      );

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                { ids: { values: ['report-1'] } },
                { terms: { space_id: ['space-a', '*'] } },
              ],
            },
          },
        })
      );
    });
  });
});
