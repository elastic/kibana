/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import { expect } from '@kbn/scout-security/api';
import {
  ATTRIBUTE_ALERTS_EVIDENCE_API_PATH,
  INDICATOR_REFERENCE_PREFIX,
  READINESS_API_PATH,
  THREAT_INTEL_INDICATORS_INDEX,
  THREAT_REPORTS_INDEX,
  type ReadinessResponse,
} from '../../../../common/threat_intel';
import { apiTest, tags, TI_HEADERS, spaceUrl } from '../fixtures';

const RUN = Date.now();
const SHA256 = randomBytes(32).toString('hex');
const REPORT_ID = `scout-curated-${RUN}`;
const SOURCE_NAME = `Scout curated feed ${RUN}`;
const EVENT_INDEX = `scout-curated-events-${RUN}`;
const OTHER_SPACE = `curated-other-${RUN}`;
const DEFAULT_ALIAS = `${THREAT_INTEL_INDICATORS_INDEX}-default`;
const INDICATOR_ID = `default:hash:${SHA256}`;
const ALERTS_INDEX = '.alerts-security.alerts-default';

const POLL_TIMEOUT_MS = 180_000;
// The promote task runs every 15 minutes and `.kibana_task_manager` is a restricted index,
// so the run cannot be pulled forward from a test. Wait out one full interval.
const PROMOTE_TIMEOUT_MS = 17 * 60_000;

interface PromotedIndicator {
  event: { kind: string; category: string[]; type: string[] };
  threat: { feed: { name: string }; indicator: { reference: string } };
}

const waitFor = async <T>(
  description: string,
  probe: () => Promise<T | undefined>,
  timeoutMs = POLL_TIMEOUT_MS
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await probe();
    if (result !== undefined) return result;
    if (Date.now() > deadline) throw new Error(`Timed out after ${timeoutMs}ms: ${description}`);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
};

/**
 * Curated threat intel changing a detection outcome: a seeded report's `discriminating` IOC is
 * promoted, an Indicator Match rule matches it through the per-space alias, the alert carries
 * the report as its join key, and the flyout enrichment finds the same indicator.
 *
 * Seeds the report directly rather than running ingest and enrich, which need an LLM
 * connector; everything from promote onward is the real path. The seed omits `content.*`,
 * which are `semantic_text` fields that need a working inference endpoint to index.
 */
apiTest.describe.serial(
  'Threat Intel - curated indicators reach detections',
  { tag: [...tags.stateful.classic] },
  () => {
    let headers: Record<string, string>;
    // Public routes (rules, spaces) are versioned by date, unlike the internal threat intel routes.
    let publicHeaders: Record<string, string>;
    let ruleId: string | undefined;

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...TI_HEADERS, ...cookieHeader };
      publicHeaders = { ...headers, 'elastic-api-version': '2023-10-31' };

      const now = new Date().toISOString();
      await esClient.index({
        index: THREAT_REPORTS_INDEX,
        id: REPORT_ID,
        refresh: true,
        document: {
          space_id: 'default',
          source: { name: SOURCE_NAME },
          lineage: { extracted_at: now },
          extracted: {
            iocs: [{ type: 'hash', value: SHA256, tier: 'discriminating' }],
          },
        },
      });
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      if (ruleId) {
        await apiClient.delete(`api/detection_engine/rules?id=${ruleId}`, {
          headers: publicHeaders,
          responseType: 'json',
        });
      }
      await apiClient.delete(`api/spaces/space/${OTHER_SPACE}`, { headers: publicHeaders });
      await esClient.indices.delete({ index: EVENT_INDEX }, { ignore: [404] });
      await esClient.delete({ index: THREAT_REPORTS_INDEX, id: REPORT_ID }, { ignore: [404] });
      await esClient.delete(
        { index: THREAT_INTEL_INDICATORS_INDEX, id: INDICATOR_ID, refresh: true },
        { ignore: [404] }
      );
      await esClient.deleteByQuery(
        {
          index: ALERTS_INDEX,
          query: {
            term: { 'threat.enrichments.indicator.reference': `threat-report:${REPORT_ID}` },
          },
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
    });

    apiTest(
      'promotes the IOC with the ECS fields legacy readers filter on',
      async ({ esClient }) => {
        apiTest.setTimeout(PROMOTE_TIMEOUT_MS + 60_000);

        const row = await waitFor(
          'promoted indicator on the default alias',
          async () => {
            const response = await esClient.search({
              index: DEFAULT_ALIAS,
              query: { term: { 'threat.indicator.file.hash.sha256': SHA256 } },
            });
            return response.hits.hits[0]?._source as PromotedIndicator | undefined;
          },
          PROMOTE_TIMEOUT_MS
        );

        expect(row.event).toStrictEqual({
          kind: 'enrichment',
          category: ['threat'],
          type: ['indicator'],
        });
        expect(row.threat.feed.name).toBe(SOURCE_NAME);
        expect(row.threat.indicator.reference).toBe(`${INDICATOR_REFERENCE_PREFIX}${REPORT_ID}`);
      }
    );

    apiTest(
      'an Indicator Match rule over the alias alerts with the report as join key',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(POLL_TIMEOUT_MS + 60_000);

        await esClient.index({
          index: EVENT_INDEX,
          refresh: true,
          document: {
            '@timestamp': new Date().toISOString(),
            'file.hash.sha256': SHA256,
            'host.name': 'scout-curated-host',
          },
        });

        const created = await apiClient.post('api/detection_engine/rules', {
          headers: publicHeaders,
          responseType: 'json',
          body: {
            type: 'threat_match',
            name: `Scout curated indicator match ${RUN}`,
            description: 'Scout: curated indicators reach detections',
            severity: 'low',
            risk_score: 1,
            language: 'kuery',
            query: 'file.hash.sha256: *',
            index: [EVENT_INDEX],
            threat_index: [DEFAULT_ALIAS],
            threat_query: 'event.type: indicator',
            threat_mapping: [
              {
                entries: [
                  {
                    field: 'file.hash.sha256',
                    type: 'mapping',
                    value: 'threat.indicator.file.hash.sha256',
                  },
                ],
              },
            ],
            threat_indicator_path: 'threat.indicator',
            interval: '1m',
            from: 'now-1h',
            enabled: true,
          },
        });
        expect(created).toHaveStatusCode(200);
        ruleId = (created.body as { id: string }).id;

        // The alert must carry the report as its enrichment reference, the join key the
        // attribute-alerts workflow matches on.
        const alertId = await waitFor(
          'threat_match alert carrying the report reference',
          async () => {
            const response = await esClient.search({
              index: ALERTS_INDEX,
              query: {
                bool: {
                  filter: [
                    { term: { 'kibana.alert.rule.uuid': ruleId } },
                    {
                      nested: {
                        path: 'threat.enrichments',
                        query: {
                          term: {
                            'threat.enrichments.indicator.reference': `${INDICATOR_REFERENCE_PREFIX}${REPORT_ID}`,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            });
            return response.hits.hits[0]?._id;
          }
        );
        expect(alertId).toBeDefined();
      }
    );

    apiTest(
      'the attribute-alerts match credits the hit back to the report',
      async ({ apiClient, esClient }) => {
        // The same layer-1 filter `attribute_alerts_to_reports.yaml` runs. `threat.enrichments` is
        // nested in the alerts index, so a bare term or regexp on it matches nothing.
        const hits = await esClient.count({
          index: ALERTS_INDEX,
          query: {
            nested: {
              path: 'threat.enrichments',
              query: {
                regexp: {
                  'threat.enrichments.indicator.reference': `threat-report:(${REPORT_ID})`,
                },
              },
            },
          },
        });
        expect(hits.count).toBe(1);

        const stamped = await apiClient.post(ATTRIBUTE_ALERTS_EVIDENCE_API_PATH, {
          headers,
          responseType: 'json',
          body: {
            index: THREAT_REPORTS_INDEX,
            id: REPORT_ID,
            window: '7d',
            computedAt: new Date().toISOString(),
            iocMatchHits: hits.count,
            techniqueOverlapHits: 0,
            alertHitsTotal: hits.count,
          },
        });
        expect(stamped).toHaveStatusCode(200);

        const report = await esClient.get<{
          evidence: Array<{ space_id: string; alert_hits_total: number }>;
        }>({ index: THREAT_REPORTS_INDEX, id: REPORT_ID });
        expect(
          report._source?.evidence.find((entry) => entry.space_id === 'default')?.alert_hits_total
        ).toBe(1);
      }
    );

    apiTest('the event enrichment search finds the curated indicator', async ({ apiClient }) => {
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

      const response = await apiClient.post('internal/search/securitySolutionSearchStrategy', {
        headers,
        responseType: 'json',
        body: {
          factoryQueryType: 'eventEnrichment',
          defaultIndex: [DEFAULT_ALIAS],
          eventFields: { 'file.hash.sha256': SHA256 },
          timerange: { from: from.toISOString(), to: to.toISOString(), interval: '' },
          filterQuery: '',
        },
      });

      expect(response).toHaveStatusCode(200);
      const { enrichments } = response.body as { enrichments: Array<Record<string, unknown>> };
      expect(enrichments).toHaveLength(1);
      expect(JSON.stringify(enrichments[0])).toContain('investigation_time');
    });

    apiTest(
      'a second space gets its own alias and none of the default space rows',
      async ({ apiClient, esClient }) => {
        const space = await apiClient.post('api/spaces/space', {
          headers: publicHeaders,
          responseType: 'json',
          body: { id: OTHER_SPACE, name: OTHER_SPACE },
        });
        expect(space).toHaveStatusCode(200);

        const readiness = await apiClient.get(spaceUrl(READINESS_API_PATH.slice(1), OTHER_SPACE), {
          headers,
          responseType: 'json',
        });
        expect(readiness).toHaveStatusCode(200);
        const { indicatorAlias } = readiness.body as ReadinessResponse;
        const otherAlias = `${THREAT_INTEL_INDICATORS_INDEX}-${OTHER_SPACE}`;
        expect(indicatorAlias).toBe(otherAlias);

        const rows = await esClient.search({
          index: otherAlias,
          query: { term: { 'threat.indicator.file.hash.sha256': SHA256 } },
        });
        expect(rows.hits.hits).toHaveLength(0);
      }
    );
  }
);
