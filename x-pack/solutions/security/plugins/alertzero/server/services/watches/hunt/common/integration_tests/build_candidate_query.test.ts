/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { HUNT_GLOBAL_SPACE_ID, HUNT_REPORTS_INDEX } from '../../../../../../common/constants';
import { buildCandidateQuery } from '../build_candidate_query';

const SPACE = 'default';
const HELD_BACK_LINE = 'report(s) held back: nothing to hunt';

interface Evidence {
  space_id: string;
  last_hunted_at?: string;
  coverage_pending?: boolean;
}

interface ReportFixture {
  id: string;
  spaceId?: string;
  title: string;
  body?: string;
  method?: string;
  /** Omitted on purpose for the report with no relevance score. */
  relevance?: number;
  iocs?: string[];
  techniques?: string[];
  behaviorTechniqueIds?: string[];
  /** How much of the article enrich read; `degraded_context` is the excerpts-only retry. */
  contextMode?: 'full' | 'degraded_context';
  evidence?: Evidence[];
}

const BULLETIN_TWO_ID = 'gsVs6qEBz0qBNxRToyCm';
const BULLETIN_ONE_ID = 'WMVs6qEBz0qBNxRT2iFl';

/**
 * The two bulletins are real reports from the local Hunt Watch corpus, copied verbatim.
 * Provenance, retrieved 2026-11-19:
 * - BULLETIN_TWO: https://www.cisa.gov/news-events/alerts/2026/11/13/cisa-adds-two-known-exploited-vulnerabilities-catalog (published 2026-11-13, enrich relevance 0.25)
 * - BULLETIN_ONE: https://www.cisa.gov/news-events/alerts/2026/11/04/cisa-adds-one-known-exploited-vulnerability-catalog (published 2026-11-04, enrich relevance 0.3)
 */
const BULLETIN_TWO = {
  title: 'CISA Adds Two Known Exploited Vulnerabilities to Catalog',
  body: 'CISA has added two new vulnerabilities to its Known Exploited Vulnerabilities (KEV) Catalog, based on evidence of active exploitation.\n- CVE-2026-114713 UnrealIRCd Improper Neutralization of Delimiters Vulnerability\n- CVE-2026-123039 Check Point Multiple Products Incorrect Permission Assignment for Critical Resource Vulnerability\nThese types of vulnerabilities are a frequent attack vector for malicious cyber actors and pose significant risks to the federal enterprise.\nBinding Operational Directive (BOD) 26-04: Prioritizing Security Updates Based on Risk establishes vulnerability management requirements for Federal Civilian Executive Branch (FCEB) agencies. BOD 26-04 reinforces the importance of the KEV Catalog and requires federal agencies to prioritize rapid remediation of high-risk vulnerabilities, specifically those identified by Common Vulnerabilities and Exposures (CVEs) listed in CISA\u2019s KEV Catalog on publicly exposed assets that grant total control of the asset post-exploitation, while deferring action for lower-risk vulnerabilities. BOD 26-04 further establishes basic expectations for when agencies must check whether threat actors compromised the system before the patch was applied.\nWhile BOD 26-04 applies only to FCEB agencies, CISA encourages all organizations to adopt risk-based vulnerability management and prioritize remediation of KEV Catalog vulnerabilities. CISA will continue to add vulnerabilities to the catalog that meet the specified criteria.\nAware of an exploited vulnerability not currently listed in the KEV Catalog? Submit it for potential addition through CISA\u2019s KEV Nomination Form. Potential KEV additions must have a CVE ID, evidence of exploitation, and clear mitigation guidance.',
};
const BULLETIN_ONE = {
  title: 'CISA Adds One Known Exploited Vulnerability to Catalog',
  body: 'CISA has added one new vulnerability to its\u00a0Known Exploited Vulnerabilities (KEV) Catalog, based on evidence of active exploitation.\n- CVE-2024-27834 Apple Multiple Products Improper Authentication Vulnerability\nThis type of vulnerability is a frequent attack vector for malicious cyber actors and poses significant risks to the federal enterprise.\nBinding Operational Directive (BOD) 26-04: Prioritizing Security Updates Based on Risk establishes vulnerability management requirements for Federal Civilian Executive Branch (FCEB) agencies. BOD 26-04 reinforces the importance of the KEV Catalog and requires federal agencies to prioritize rapid remediation of high-risk vulnerabilities, specifically those identified by Common Vulnerabilities and Exposures (CVEs) listed in CISA\u2019s KEV Catalog on publicly exposed assets that grant total control of the asset post-exploitation, while deferring action for lower-risk vulnerabilities. BOD 26-04 further establishes basic expectations for when agencies must check whether threat actors compromised the system before the patch was applied.\nWhile BOD 26-04 applies only to FCEB agencies, CISA encourages all organizations to adopt risk-based vulnerability management and prioritize remediation of\u00a0KEV Catalog vulnerabilities. CISA will continue to add vulnerabilities to the catalog that meet the\u00a0specified criteria.\nAware of an exploited vulnerability not currently listed in the KEV Catalog? Submit it for potential addition through CISA\u2019s\u00a0KEV Nomination Form. Potential KEV additions must have a CVE ID, evidence of exploitation, and clear mitigation guidance.',
};

describe('buildCandidateQuery against Elasticsearch', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;

  // Every fixture is dated relative to now so the scheduled lookback never expires the test. The
  // bulletins' real publication dates live in the provenance comment above.
  const recently = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const reports: ReportFixture[] = [
    {
      id: BULLETIN_TWO_ID,
      spaceId: HUNT_GLOBAL_SPACE_ID,
      title: BULLETIN_TWO.title,
      body: BULLETIN_TWO.body,
      relevance: 0.25,
      iocs: [],
      techniques: [],
      behaviorTechniqueIds: [],
      contextMode: 'full',
    },
    {
      id: BULLETIN_ONE_ID,
      spaceId: HUNT_GLOBAL_SPACE_ID,
      title: BULLETIN_ONE.title,
      body: BULLETIN_ONE.body,
      relevance: 0.3,
      iocs: [],
      techniques: [],
      behaviorTechniqueIds: [],
    },
    {
      id: 'empty-point-two',
      title: 'No indicators, no techniques, unmapped behavior',
      relevance: 0.2,
      iocs: [],
      techniques: [],
      behaviorTechniqueIds: [''],
    },
    { id: 'relevance-zero', title: 'Integer zero relevance', relevance: 0 },
    {
      id: 'has-indicator',
      title: 'Low relevance, one indicator',
      relevance: 0.2,
      iocs: ['198.51.100.7'],
    },
    {
      id: 'has-technique',
      title: 'Low relevance, one technique',
      relevance: 0.2,
      techniques: ['T1190'],
    },
    {
      id: 'has-mapped-behavior',
      title: 'Low relevance, one mapped behavior',
      relevance: 0.2,
      behaviorTechniqueIds: ['T1133'],
    },
    {
      id: 'degraded-context',
      title: 'Low relevance, but enrich read only excerpts',
      relevance: 0.2,
      iocs: [],
      behaviorTechniqueIds: [],
      contextMode: 'degraded_context',
    },
    { id: 'kev-baseline', title: 'KEV-shaped, exactly 0.5', method: 'kev', relevance: 0.5 },
    { id: 'no-relevance', title: 'No relevance score at all' },
    {
      id: 'hunted-and-pending',
      title: 'Low relevance, hunted here, coverage pending',
      relevance: 0.2,
      evidence: [{ space_id: SPACE, last_hunted_at: recently, coverage_pending: true }],
    },
    {
      id: 'hunted-in-other-space',
      title: 'Low relevance, hunted and pending only in another space',
      relevance: 0.2,
      evidence: [{ space_id: 'other', last_hunted_at: recently, coverage_pending: true }],
    },
    {
      id: 'hunted-not-pending',
      title: 'Low relevance, hunted here, not pending',
      relevance: 0.2,
      evidence: [{ space_id: SPACE, last_hunted_at: recently }],
    },
  ];

  const toDocument = ({
    spaceId = SPACE,
    title,
    body,
    method = 'workflow_v4',
    relevance,
    iocs,
    techniques,
    behaviorTechniqueIds,
    contextMode,
    evidence,
  }: ReportFixture) => ({
    space_id: spaceId,
    '@timestamp': recently,
    content: { title, ...(body && { body_text: body }), published_at: recently },
    lineage: { extraction_method: method },
    severity: { level: 'medium' },
    extracted: {
      ...(relevance !== undefined && { relevance }),
      ...(iocs && { iocs: iocs.map((value) => ({ value })) }),
      ...(techniques && { ttps: { techniques } }),
      ...(behaviorTechniqueIds && {
        behaviors: behaviorTechniqueIds.map((technique_id) => ({ technique_id })),
      }),
      ...(contextMode && { core: { context_mode: contextMode } }),
    },
    ...(evidence && { evidence }),
  });

  const sweep = (logger = loggingSystemMock.createLogger()) =>
    buildCandidateQuery(esClient, logger, { trigger: 'scheduled', spaceId: SPACE }).then(
      (result) => ({ result, logger })
    );

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: { es: { license: 'basic' } },
    });
    esServer = await startES();
    esClient = esServer.es.getClient() as unknown as ElasticsearchClient;

    // Only what the candidate query reads, as the threat intel index template maps it. The template
    // lives in security_solution, which this plugin cannot import. `corroborated_rank_score` is
    // sorted with no `unmapped_type`, so every search fails under a strict mapping without it.
    await esClient.indices.create({
      index: HUNT_REPORTS_INDEX,
      mappings: {
        dynamic: 'strict',
        properties: {
          space_id: { type: 'keyword' },
          '@timestamp': { type: 'date' },
          rank_score: { type: 'float' },
          content: {
            properties: {
              title: { type: 'text' },
              body_text: { type: 'text' },
              published_at: { type: 'date' },
            },
          },
          lineage: { properties: { extraction_method: { type: 'keyword' } } },
          severity: { properties: { level: { type: 'keyword' } } },
          extracted: {
            properties: {
              relevance: { type: 'float' },
              core: { properties: { context_mode: { type: 'keyword' } } },
              gate: { properties: { is_intelligence: { type: 'boolean' } } },
              iocs: { type: 'nested', properties: { value: { type: 'keyword' } } },
              ttps: { properties: { techniques: { type: 'keyword' } } },
              behaviors: { type: 'nested', properties: { technique_id: { type: 'keyword' } } },
            },
          },
          evidence: {
            type: 'nested',
            properties: {
              space_id: { type: 'keyword' },
              last_hunted_at: { type: 'date' },
              coverage_pending: { type: 'boolean' },
              hunt_retry_count: { type: 'integer' },
              corroborated_rank_score: { type: 'float' },
            },
          },
        },
      },
    });

    await esClient.bulk({
      refresh: true,
      operations: reports.flatMap((report) => [
        { index: { _index: HUNT_REPORTS_INDEX, _id: report.id } },
        toDocument(report),
      ]),
    });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  describe('a scheduled sweep', () => {
    it('selects every report except the ones with nothing to hunt, and the ones already hunted', async () => {
      const { result } = await sweep();

      expect([...result.ids].sort()).toEqual(
        [
          'has-indicator',
          'has-technique',
          'has-mapped-behavior',
          'degraded-context',
          'kev-baseline',
          'no-relevance',
          'hunted-and-pending',
        ].sort()
      );
      expect(result.total).toBe(7);
    });

    it('does not hold back a report enrich read only in part', async () => {
      const { result } = await sweep();
      expect(result.ids).toContain('degraded-context');
    });

    it('holds back the real CISA bulletins', async () => {
      const { result } = await sweep();
      expect(result.ids).not.toContain(BULLETIN_TWO_ID);
      expect(result.ids).not.toContain(BULLETIN_ONE_ID);
    });

    it('holds back a score of integer zero and an unmapped behavior id', async () => {
      const { result } = await sweep();
      expect(result.ids).not.toContain('relevance-zero');
      expect(result.ids).not.toContain('empty-point-two');
    });

    it('does not let a pending flag from another space exempt a report', async () => {
      const { result } = await sweep();
      expect(result.ids).not.toContain('hunted-in-other-space');
    });

    it('keeps hunt-once for a hunted report that is not pending', async () => {
      const { result } = await sweep();
      expect(result.ids).not.toContain('hunted-not-pending');
    });

    it('logs the held-back count: the two bulletins, the empty one, the zero, the other-space one', async () => {
      const { logger } = await sweep();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`5 ${HELD_BACK_LINE}`));
    });
  });

  describe('a manual run naming a held-back report', () => {
    it('selects it, and logs no held-back count', async () => {
      const logger = loggingSystemMock.createLogger();

      const result = await buildCandidateQuery(esClient, logger, {
        trigger: 'manual',
        spaceId: SPACE,
        report_ids: [BULLETIN_TWO_ID],
      });

      expect(result.ids).toEqual([BULLETIN_TWO_ID]);
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining(HELD_BACK_LINE));
    });
  });
});
