/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { executeEsql, generateEsql } from '@kbn/agent-builder-genai-utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { HuntBehaviorModels } from '../types';
import { huntBehavior } from './hunt_behavior';
import {
  HUNT_EXTRACTION_ENVIRONMENT_CONTEXT_MAX_CHARS,
  HUNT_EXTRACTION_REPORT_TEXT_MAX_CHARS,
} from '../common/hunt_prompt_templates';
import { ESQL_GENERATION_INSTRUCTIONS } from './extraction_contract';
import { buildMitreCatalog } from './mitre_catalog';
import { getSearchedTechniqueIds } from './searched_technique_ids';
import { UNGROUNDED_QUERY_FIXTURES } from './ungrounded_query_fixtures';

/**
 * A small ATT&CK Enterprise entity set for tests that need real-looking technique ids, plus 30
 * filler techniques: enough to exceed Tier 2's per-report generation budget.
 */
// A hoisted function declaration (mock-prefixed) so the jest.mock factory below can call it.
function mockBuildEnterpriseFixture(): MitreEntity[] {
  const { buildMockMitreTechnique, buildMockMitreSubtechnique, buildMockMitreEntities } =
    jest.requireActual<typeof import('@kbn/security-mitre-attack-mocks')>(
      '@kbn/security-mitre-attack-mocks'
    );
  return [
    buildMockMitreTechnique({ id: 'T1566', name: 'Phishing', tactic_ids: ['TA0001'] }),
    buildMockMitreTechnique({ id: 'T1078', name: 'Valid Accounts', tactic_ids: ['TA0001'] }),
    buildMockMitreSubtechnique({
      id: 'T1078.004',
      name: 'Cloud Accounts',
      technique_id: 'T1078',
      tactic_ids: ['TA0001'],
    }),
    ...buildMockMitreEntities(30),
  ];
}

// The catalog now comes from the managed MITRE data client; serve a fixed ATT&CK Enterprise
// catalog instead so these tests do not need a data client.
jest.mock('./mitre_catalog', () => {
  const actual = jest.requireActual('./mitre_catalog');
  const { buildMitreCatalog: build } = actual;
  const catalog = build(mockBuildEnterpriseFixture());
  return { ...actual, getMitreCatalog: jest.fn(async () => catalog) };
});

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
  executeEsql: jest.fn(),
}));

const enterpriseCatalog = buildMitreCatalog(mockBuildEnterpriseFixture());

const generateEsqlMock = generateEsql as jest.MockedFunction<typeof generateEsql>;
const executeEsqlMock = executeEsql as jest.MockedFunction<typeof executeEsql>;

const GROUNDED_ESQL =
  'FROM logs-aws.cloudtrail-*\n| WHERE aws.cloudtrail.event_name == "AssumeRole"\n| KEEP host.name, user.name\n| LIMIT 100';
const T1566_ESQL = 'FROM logs-aws.*\n| WHERE email.from.address == "evil@example.com"\n| LIMIT 10';

// Report text the fixtures' quotes and generated-query literals are drawn from, so the
// grounding checks (evidence_quote must appear in the text; a query must filter on a report
// value) pass on the happy paths. Tests that assert dropping supply their own text.
const REPORT_TEXT =
  'Incident report: cloud account abuse via AssumeRole was observed. The intrusion started ' +
  'with spear phishing used against staff, and a phishing email delivered the payload from ' +
  'evil@example.com. Analysts recorded a second quote, a weaker quote, and a stronger quote ' +
  'as corroborating evidence.';

/** Resolve a grounded query per technique id from the `nlQuery` the service builds. */
const generateByTechnique = (queries: Record<string, string>) =>
  generateEsqlMock.mockImplementation(async ({ nlQuery }) => {
    const match = Object.entries(queries).find(([id]) => nlQuery.includes(id));
    return match ? { query: match[1] } : { error: `no fixture for ${nlQuery}` };
  });

const buildMockModel = (
  candidates: Array<{ technique_id: string; evidence_quote: string; llm_confidence: number }> = []
): HuntBehaviorModels => {
  const withStructuredOutput = jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ candidates }),
  });
  const model: ScopedModel = {
    chatModel: { withStructuredOutput } as unknown as ScopedModel['chatModel'],
    inferenceClient: {} as ScopedModel['inferenceClient'],
    connector: {} as ScopedModel['connector'],
  };
  return { extraction: model, esql: model };
};

// Carries a stub `esql.query` because the probe-scoping wrapper reads `esClient.esql` when the
// generator client is built. `generateEsql`/`executeEsql` are mocked, so it is never called.
const esClient = {
  esql: { query: jest.fn().mockResolvedValue({ columns: [], values: [] }) },
} as unknown as ElasticsearchClient;
const col = (name: string) => ({ name, type: 'keyword' });
const logger = loggingSystemMock.createLogger();

const t1078Candidate = {
  technique_id: 'T1078.004',
  evidence_quote: 'cloud account abuse via AssumeRole',
  llm_confidence: 0.9,
};
const t1566Candidate = { technique_id: 'T1566', evidence_quote: 'phishing', llm_confidence: 0.9 };

const executeParams = {
  text: REPORT_TEXT,
  window: { from: 'now-30d', to: 'now' },
  allowed_indices: ['logs-aws.*'],
  row_limit: 25,
};

describe('huntBehavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateByTechnique({ 'T1078.004': GROUNDED_ESQL, T1566: T1566_ESQL });
    executeEsqlMock.mockResolvedValue({ columns: [], values: [] });
  });

  it('clamps extraction template variables to the gateway bounds', async () => {
    const chatComplete = jest.fn().mockResolvedValue({ content: '{"candidates":[]}' });
    const extraction = {
      chatModel: { withStructuredOutput: jest.fn() },
      inferenceClient: { chatComplete },
      connector: {
        connectorId: 'daybreak',
        metadata: { capabilities: { templates: { policy: 'required' } } },
      },
    } as unknown as ScopedModel;
    const esql = {
      chatModel: { withStructuredOutput: jest.fn() },
      inferenceClient: { chatComplete: jest.fn() },
      connector: { connectorId: 'frontier', metadata: {} },
    } as unknown as ScopedModel;

    await huntBehavior({ extraction, esql }, logger, {
      text: 'A'.repeat(HUNT_EXTRACTION_REPORT_TEXT_MAX_CHARS + 50),
      article_context: {
        sample_events: ['E'.repeat(HUNT_EXTRACTION_ENVIRONMENT_CONTEXT_MAX_CHARS)],
      },
    });

    const variables = chatComplete.mock.calls[0][0].template.variables;
    expect(variables.report_text).toHaveLength(HUNT_EXTRACTION_REPORT_TEXT_MAX_CHARS);
    expect(variables.environment_context.length).toBeLessThanOrEqual(
      HUNT_EXTRACTION_ENVIRONMENT_CONTEXT_MAX_CHARS
    );
    expect(variables.environment_context).toContain('E');
    expect(chatComplete.mock.calls[0][0].template.id).toBe('.hunt-behavior-extraction');
  });

  it('returns no_behaviors_found when LLM extracts nothing', async () => {
    const result = await huntBehavior(buildMockModel([]), logger, { text: 'some report text' });
    expect(result.status).toBe('no_behaviors_found');
  });

  it('returns has_hit false when LLM extracts nothing', async () => {
    const result = await huntBehavior(buildMockModel([]), logger, { text: 'some report text' });
    expect(result.has_hit).toBe(false);
  });

  it('returns no_behaviors_found when candidates are below the confidence threshold', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'phishing email', llm_confidence: 0.3 },
    ]);
    const result = await huntBehavior(model, logger, {
      text: REPORT_TEXT,
      llm_confidence_threshold: 0.5,
    });
    expect(result.status).toBe('no_behaviors_found');
  });

  it('returns behaviors_proposed for a catalog technique id', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
      { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
    ]);
    const result = await huntBehavior(model, logger, { text: REPORT_TEXT });
    expect(result.status).toBe('behaviors_proposed');
  });

  it('returns only the catalog-validated technique', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
      { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
    ]);
    const result = await huntBehavior(model, logger, { text: REPORT_TEXT });
    expect(result.behaviors).toHaveLength(1);
  });

  it('returns the dropped unknown technique id', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
      { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
    ]);
    const result = await huntBehavior(model, logger, { text: REPORT_TEXT });
    expect(result.incomplete).toContainEqual(
      expect.objectContaining({ reason: 'unknown_technique_id', technique_id: 'T9999999' })
    );
  });

  it('skips extraction and reports one report-level catalog_unavailable gap when the catalog is empty', async () => {
    const { getMitreCatalog } = jest.requireMock('./mitre_catalog');
    getMitreCatalog.mockResolvedValueOnce({
      techniqueById: new Map(),
      subtechniqueById: new Map(),
    });
    const warnMock = logger.warn as jest.Mock;
    warnMock.mockClear();
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
      { technique_id: 'T1566', evidence_quote: 'phishing', llm_confidence: 0.9 },
    ]);
    const result = await huntBehavior(model, logger, { text: REPORT_TEXT });
    expect(model.extraction.chatModel.withStructuredOutput).not.toHaveBeenCalled();
    expect(result.status).toBe('no_behaviors_validated');
    expect(result.behaviors).toHaveLength(0);
    expect(result.incomplete).toEqual([
      expect.objectContaining({ reason: 'catalog_unavailable', detail: expect.any(String) }),
    ]);
    expect(result.incomplete?.[0].technique_id).toBeUndefined();
    expect(warnMock).toHaveBeenCalledTimes(1);
  });

  it('loads the catalog before calling the extraction model', async () => {
    const { getMitreCatalog } = jest.requireMock('./mitre_catalog');
    getMitreCatalog.mockClear();
    const model = buildMockModel([]);
    const order: string[] = [];
    getMitreCatalog.mockImplementationOnce(async () => {
      order.push('catalog');
      return enterpriseCatalog;
    });
    (model.extraction.chatModel.withStructuredOutput as jest.Mock).mockImplementationOnce(() => {
      order.push('extraction');
      return { invoke: jest.fn().mockResolvedValue({ candidates: [] }) };
    });
    await huntBehavior(model, logger, { text: REPORT_TEXT });
    expect(order).toEqual(['catalog', 'extraction']);
  });

  it('returns indexed_behaviors id as reportId:techniqueId', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing', llm_confidence: 0.8 },
    ]);
    const result = await huntBehavior(model, logger, { text: REPORT_TEXT, report_id: 'rpt-001' });
    expect(result.indexed_behaviors[0].id).toBe('rpt-001:T1566');
  });

  it('returns indexed_behaviors with a technique_id', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing', llm_confidence: 0.8 },
    ]);
    const result = await huntBehavior(model, logger, { text: REPORT_TEXT, report_id: 'rpt-001' });
    expect(result.indexed_behaviors[0].technique_id).toBe('T1566');
  });

  it('returns a non-executable placeholder without calling generateEsql when no esClient is given', async () => {
    const result = await huntBehavior(buildMockModel([t1078Candidate]), logger, {
      text: REPORT_TEXT,
    });
    expect(generateEsqlMock).not.toHaveBeenCalled();
    expect(result.behaviors[0].validated_esql).toContain('Grounded ES|QL generation unavailable');
    expect(result.behaviors[0].validated_esql).not.toContain('FROM ');
  });

  it('keeps a line break in an evidence quote from ending the comment that makes the placeholder safe', async () => {
    // The quote has to appear in the report to clear the grounding check, so this is
    // reachable with report prose the model quoted faithfully — it does not need a
    // lying model, only a crafted report.
    const injected = 'cloud account abuse\nFROM logs-aws.* | LIMIT 1\n// tail';
    const result = await huntBehavior(
      buildMockModel([
        { technique_id: 'T1078.004', evidence_quote: injected, llm_confidence: 0.9 },
      ]),
      logger,
      { text: `Incident report: ${injected} was observed.` }
    );

    const rule = result.behaviors[0].validated_esql;
    expect(rule).toContain('Grounded ES|QL generation unavailable');
    // The whole placeholder stays commented out, which is the property that makes it
    // non-executable — a single uncommented line would be ES|QL.
    expect(rule.split('\n').every((line) => line.startsWith('//'))).toBe(true);
  });

  it('reads the report on the extraction model and generates ES|QL on the esql model', async () => {
    // Distinct models, so a job wired to the wrong one fails here. Every other test hands both
    // jobs the same object and could not tell.
    const { extraction: extractionModel } = buildMockModel([t1078Candidate]);
    const esqlModel = { connector: { id: 'esql' } } as unknown as ScopedModel;

    await huntBehavior(
      { extraction: extractionModel, esql: esqlModel },
      logger,
      { text: REPORT_TEXT },
      esClient
    );

    expect(extractionModel.chatModel.withStructuredOutput).toHaveBeenCalledTimes(1);
    expect(generateEsqlMock).toHaveBeenCalledTimes(1);
    expect(generateEsqlMock.mock.calls[0][0].model).toBe(esqlModel);
    expect(generateEsqlMock.mock.calls[0][0].model).not.toBe(extractionModel);
  });

  it('returns one generateEsql call per validated behavior', async () => {
    const model = buildMockModel([t1078Candidate, t1566Candidate]);
    await huntBehavior(model, logger, { text: REPORT_TEXT }, esClient);
    expect(generateEsqlMock).toHaveBeenCalledTimes(2);
  });

  it('returns one behavior and one generateEsql call when the LLM emits the same technique id twice', async () => {
    const model = buildMockModel([
      t1078Candidate,
      { ...t1078Candidate, evidence_quote: 'a second quote', llm_confidence: 0.7 },
    ]);
    const result = await huntBehavior(
      model,
      logger,
      { text: REPORT_TEXT, report_id: 'rpt-1' },
      esClient
    );
    expect(result.behaviors).toHaveLength(1);
    expect(result.indexed_behaviors.map((b) => b.id)).toEqual(['rpt-1:T1078.004']);
    expect(generateEsqlMock).toHaveBeenCalledTimes(1);
  });

  it('returns the higher-confidence candidate when the LLM emits the same technique id twice', async () => {
    const model = buildMockModel([
      { ...t1078Candidate, evidence_quote: 'weaker quote', llm_confidence: 0.6 },
      { ...t1078Candidate, evidence_quote: 'stronger quote', llm_confidence: 0.95 },
    ]);
    const result = await huntBehavior(model, logger, { text: REPORT_TEXT });
    expect(result.behaviors).toEqual([
      expect.objectContaining({ evidence_quote: 'stronger quote', llm_confidence: 0.95 }),
    ]);
  });

  it('ignores matched_indices and targets the full allowed_indices union, even when a matched index sits inside it', async () => {
    // Decided (Q2): one query over the union for the demo. Narrowing to whichever
    // concrete index Tier 1's per-index buckets happened to hit is exactly what this
    // must not do — a coincidental IOC match landing in an unrelated dataset that
    // shares a baseline wildcard must not misdirect the FROM to that dataset alone.
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      {
        text: REPORT_TEXT,
        allowed_indices: ['logs-aws.*', 'logs-endpoint.events.*'],
        article_context: {
          matched_indices: ['.ds-logs-aws.cloudtrail-default-2026.09.01-000001', '.kibana'],
        },
      },
      esClient
    );
    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'logs-aws.*,logs-endpoint.events.*' })
    );
  });

  it('ignores matched_indices entirely under a broad scope too, targeting the broad pattern', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      {
        text: REPORT_TEXT,
        allowed_indices: ['logs-*'],
        article_context: {
          matched_indices: [
            '.ds-logs-aws.cloudtrail-default-2026.09.01-000001',
            'logs-okta.system-default',
          ],
        },
      },
      esClient
    );
    expect(generateEsqlMock).toHaveBeenCalledWith(expect.objectContaining({ index: 'logs-*' }));
  });

  it('strips exclusion entries from allowed_indices before building the FROM target', async () => {
    // Exclusion entries (`-logs-elastic_agent*`) belong to the search, not to a FROM.
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      {
        text: REPORT_TEXT,
        allowed_indices: ['logs-*', '-logs-elastic_agent*', '-logs-fleet_server*'],
      },
      esClient
    );
    expect(generateEsqlMock).toHaveBeenCalledWith(expect.objectContaining({ index: 'logs-*' }));
  });

  it('returns generateEsql targeting the required indices when Tier 1 had no hits', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: REPORT_TEXT, allowed_indices: ['logs-aws.*', 'logs-okta.*'] },
      esClient
    );
    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'logs-aws.*,logs-okta.*' })
    );
  });

  it('returns generateEsql targeting logs-* when neither hits nor scope name an index', async () => {
    await huntBehavior(buildMockModel([t1078Candidate]), logger, { text: REPORT_TEXT }, esClient);
    expect(generateEsqlMock).toHaveBeenCalledWith(expect.objectContaining({ index: 'logs-*' }));
  });

  it('returns generateEsql in schema-probe mode with the hunt instructions and row limit', async () => {
    await huntBehavior(buildMockModel([t1078Candidate]), logger, executeParams, esClient);
    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        execute: 'schema',
        disableNamedParams: true,
        rowLimit: 25,
        additionalInstructions: ESQL_GENERATION_INSTRUCTIONS,
      })
    );
  });

  it('returns the technique and evidence in the generateEsql natural-language query', async () => {
    await huntBehavior(buildMockModel([t1078Candidate]), logger, { text: REPORT_TEXT }, esClient);
    const { nlQuery } = generateEsqlMock.mock.calls[0][0];
    expect(nlQuery).toContain('T1078.004');
    expect(nlQuery).toContain('cloud account abuse via AssumeRole');
  });

  it('returns the extracted IOCs and report text as generateEsql context', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: `${REPORT_TEXT} the report body`, iocs: [{ type: 'ip', value: '203.0.113.7' }] },
      esClient
    );
    const { additionalContext } = generateEsqlMock.mock.calls[0][0];
    expect(additionalContext).toContain('ip: 203.0.113.7');
    expect(additionalContext).toContain('the report body');
  });

  it('includes an ADJUDICATED OUT block only when excluded_iocs is non-empty', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: REPORT_TEXT, iocs: [{ type: 'ip', value: '203.0.113.7' }] },
      esClient
    );
    expect(generateEsqlMock.mock.calls[0][0].additionalContext).not.toContain('ADJUDICATED OUT');

    generateEsqlMock.mockClear();
    generateByTechnique({ 'T1078.004': GROUNDED_ESQL });
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      {
        text: REPORT_TEXT,
        iocs: [{ type: 'hash', value: 'abc12345' }],
        excluded_iocs: [{ type: 'ip', value: '169.254.169.254' }],
      },
      esClient
    );
    const { additionalContext } = generateEsqlMock.mock.calls[0][0];
    expect(additionalContext).toContain('--- ADJUDICATED OUT (do not hunt these values) ---');
    expect(additionalContext).toContain('ip: 169.254.169.254');
  });

  it('caps the ADJUDICATED OUT block at 30 excluded IOCs', async () => {
    const excludedIocs = Array.from({ length: 40 }, (_, i) => ({
      type: 'ip',
      value: `203.0.113.${i}`,
    }));
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: REPORT_TEXT, excluded_iocs: excludedIocs },
      esClient
    );
    const { additionalContext } = generateEsqlMock.mock.calls[0][0];
    expect(additionalContext).toContain('ip: 203.0.113.0');
    expect(additionalContext).toContain('ip: 203.0.113.29');
    expect(additionalContext).not.toContain('ip: 203.0.113.30');
  });

  it('bounds the sample-events section in aggregate at the schema max of 50 events', async () => {
    // Each event is independently capped at 2048 chars by the schema (`max_tier2_sample_events`'s
    // own ceiling); unbounded in aggregate, 50 of them is ~100 KB repeated into every one of up
    // to 20 behaviors' `generateEsql` calls.
    const sampleEvents = Array.from({ length: 50 }, (_, i) => `event-${i}-`.padEnd(2048, 'x'));
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: REPORT_TEXT, article_context: { sample_events: sampleEvents } },
      esClient
    );
    const { additionalContext } = generateEsqlMock.mock.calls[0][0];
    expect(additionalContext).toBeDefined();
    // Generous ceiling covering every section (sample events + IOCs + report text + headers),
    // but an order of magnitude below the ~100 KB the unbounded array would have produced.
    expect(additionalContext?.length).toBeLessThan(20000);
    // The cap keeps whole events rather than truncating mid-event: the first event, which
    // always fits, must still be intact.
    expect(additionalContext).toContain(sampleEvents[0]);
  });

  it('returns the generated query under the grounded header as the proposed rule', async () => {
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    const rule = result.behaviors[0].validated_esql;
    expect(rule.startsWith('// Generated from hunt.hunt_behavior')).toBe(true);
    expect(rule.endsWith(`\n${GROUNDED_ESQL}`)).toBe(true);
  });

  it('refuses every generated query when allowed_indices is empty', async () => {
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: REPORT_TEXT, allowed_indices: [] },
      esClient
    );

    expect(result.behaviors[0].validated_esql).toContain('Grounded ES|QL generation unavailable');
    expect(result.behaviors[0].validated_esql).not.toContain('FROM ');
    expect(result.behaviors[0].execution?.executed).toBe(false);
    expect(executeEsqlMock).not.toHaveBeenCalled();
  });

  it('returns a non-executable placeholder when generateEsql reports an error', async () => {
    generateEsqlMock.mockResolvedValue({ error: 'Unknown column [nope]' });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.behaviors[0].validated_esql).toContain('Grounded ES|QL generation unavailable');
    expect(result.behaviors[0].validated_esql).not.toContain('FROM ');
    expect(executeEsqlMock).not.toHaveBeenCalled();
  });

  it('returns has_hit false when generateEsql reports an error', async () => {
    generateEsqlMock.mockResolvedValue({ error: 'Unknown column [nope]' });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.has_hit).toBe(false);
  });

  it('returns a non-executable placeholder when generateEsql throws', async () => {
    generateEsqlMock.mockRejectedValue(new Error('Could not discover a suitable index'));
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.behaviors[0].validated_esql).toContain('Grounded ES|QL generation unavailable');
    expect(result.behaviors[0].validated_esql).not.toContain('FROM ');
    expect(result.status).toBe('behaviors_proposed');
  });

  it('returns has_hit false when no window is provided (validate only)', async () => {
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: REPORT_TEXT, allowed_indices: ['logs-aws.*'], row_limit: 25 },
      esClient
    );
    expect(result.has_hit).toBe(false);
  });

  it('returns executed false and no execute call when no window is provided', async () => {
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: REPORT_TEXT, allowed_indices: ['logs-aws.*'], row_limit: 25 },
      esClient
    );
    expect(executeEsqlMock).not.toHaveBeenCalled();
    expect(result.behaviors[0].execution).toEqual({ executed: false, row_count: 0, hit: false });
  });

  it('returns has_hit true when a required-index row is returned', async () => {
    executeEsqlMock.mockResolvedValue({
      columns: [col('_index'), col('host.name'), col('user.name')],
      values: [['logs-aws.cloudtrail-default', 'WIN-ANALYST01', 'alice']],
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.has_hit).toBe(true);
  });

  it('returns hits from METADATA _id and _index on required-index rows', async () => {
    executeEsqlMock.mockResolvedValue({
      columns: [col('_id'), col('_index'), col('@timestamp'), col('host.name')],
      values: [
        ['doc-1', 'logs-aws.cloudtrail-default', '2026-09-24T12:00:00.000Z', 'WIN-ANALYST01'],
      ],
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.behaviors[0].hits).toEqual([
      {
        id: 'doc-1',
        index: 'logs-aws.cloudtrail-default',
        timestamp: '2026-09-24T12:00:00.000Z',
      },
    ]);
  });

  it('returns execution.hit true for a required-index row', async () => {
    // `prepareEsqlForExecute` injects `METADATA _id, _index`, so a query the model did
    // not tamper with returns both.
    executeEsqlMock.mockResolvedValue({
      columns: [col('_id'), col('_index'), col('host.name')],
      values: [['doc-1', 'logs-aws.cloudtrail-default', 'WIN-ANALYST01']],
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.behaviors[0].execution).toEqual({ executed: true, row_count: 1, hit: true });
  });

  it('flags a confirmed hit that returned no document ids as unable to show its evidence', async () => {
    // `prepareEsqlForExecute` adds the metadata columns but does not undo a `DROP _id`,
    // so `_index` can survive while the ids the refs are built from do not. The hit is
    // real; what the run cannot do is hand downstream attachment anything to render.
    executeEsqlMock.mockResolvedValue({
      columns: [col('_index'), col('host.name')],
      values: [['logs-aws.cloudtrail-default', 'WIN-ANALYST01']],
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.behaviors[0].execution).toEqual({
      executed: true,
      row_count: 1,
      hit: true,
      inconclusive_reason: 'refs_unavailable',
    });
    expect(result.behaviors[0].hits).toBeUndefined();
    expect(result.incomplete).toContainEqual(
      expect.objectContaining({ reason: 'refs_unavailable', technique_id: 'T1078.004' })
    );
  });

  it('returns has_hit false when only optional-index rows are returned', async () => {
    executeEsqlMock.mockResolvedValue({
      columns: [col('_index')],
      values: [['.alerts-security.alerts-default']],
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.has_hit).toBe(false);
  });

  it('returns the hunt window as the execute filter and the row limit as the LIMIT', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { ...executeParams, window: { from: 'now-7d', to: 'now' } },
      esClient
    );
    expect(executeEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient,
        limit: 25,
        filter: { range: { '@timestamp': { gte: 'now-7d', lt: 'now' } } },
      })
    );
  });

  it('returns METADATA _id, _index injected into the executed query', async () => {
    await huntBehavior(buildMockModel([t1078Candidate]), logger, executeParams, esClient);
    const { query } = executeEsqlMock.mock.calls[0][0];
    expect(query).toContain('FROM logs-aws.cloudtrail-* METADATA _id, _index');
    expect(query).toContain('KEEP host.name, user.name, _id, _index');
  });

  it('returns executed false without calling executeEsql when FROM is outside required scope', async () => {
    generateByTechnique({
      'T1078.004': 'FROM .kibana-*\n| WHERE true\n| LIMIT 10',
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(executeEsqlMock).not.toHaveBeenCalled();
    expect(result.behaviors[0].execution).toEqual({
      executed: false,
      row_count: 0,
      hit: false,
      inconclusive_reason: 'query_out_of_scope',
    });
    expect(result.has_hit).toBe(false);
  });

  it('returns executed false without calling executeEsql when FROM is broader than required scope', async () => {
    generateByTechnique({
      'T1078.004': 'FROM logs-*\n| WHERE true\n| LIMIT 10',
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(executeEsqlMock).not.toHaveBeenCalled();
    expect(result.behaviors[0].execution).toEqual({
      executed: false,
      row_count: 0,
      hit: false,
      inconclusive_reason: 'query_out_of_scope',
    });
  });

  it('returns the LIMIT from size when size wins over row_limit', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { ...executeParams, row_limit: 100, size: 7 },
      esClient
    );
    expect(executeEsqlMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 7 }));
  });

  it('returns executed false for a behavior whose execute throws without failing siblings', async () => {
    executeEsqlMock.mockImplementation(async ({ query }) =>
      query.includes('AssumeRole')
        ? Promise.reject(new Error('timeout'))
        : { columns: [col('_index')], values: [['logs-aws.cloudtrail-default']] }
    );
    const result = await huntBehavior(
      buildMockModel([t1078Candidate, t1566Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.behaviors.find((b) => b.technique_id === 'T1078.004')?.execution).toEqual({
      executed: false,
      row_count: 0,
      hit: false,
      inconclusive_reason: 'execute_failed',
    });
    // Transient, so the run must stay retryable rather than retiring the report on a
    // timeout that a later run would get past.
    expect(result.incomplete).toContainEqual(
      expect.objectContaining({ reason: 'execute_failed', technique_id: 'T1078.004' })
    );
  });

  it('returns has_hit true when a sibling behavior hits after another throws', async () => {
    executeEsqlMock.mockImplementation(async ({ query }) =>
      query.includes('AssumeRole')
        ? Promise.reject(new Error('timeout'))
        : { columns: [col('_index')], values: [['logs-aws.cloudtrail-default']] }
    );
    const result = await huntBehavior(
      buildMockModel([t1078Candidate, t1566Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.has_hit).toBe(true);
  });

  it('returns has_hit false when rows lack an _index column', async () => {
    executeEsqlMock.mockResolvedValue({ columns: [col('count')], values: [[3]] });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.has_hit).toBe(false);
  });

  it('returns a warning when rows lack an _index column', async () => {
    const warn = jest.spyOn(logger, 'warn');
    executeEsqlMock.mockResolvedValue({ columns: [col('count')], values: [[3]] });
    await huntBehavior(buildMockModel([t1078Candidate]), logger, executeParams, esClient);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no _index column'));
  });

  it('returns affected_hosts capped at 20 when more hosts are present', async () => {
    const hosts = Array.from({ length: 21 }, (_, i) => `host-${i}`);
    executeEsqlMock.mockResolvedValue({
      columns: [col('_index'), col('host.name')],
      values: hosts.map((h) => ['logs-aws.cloudtrail-default', h]),
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { ...executeParams, row_limit: 50 },
      esClient
    );
    expect(result.behaviors[0].affected_hosts).toHaveLength(20);
  });

  it('returns the truncation flag when more than 20 hosts are present', async () => {
    const hosts = Array.from({ length: 21 }, (_, i) => `host-${i}`);
    executeEsqlMock.mockResolvedValue({
      columns: [col('_index'), col('host.name')],
      values: hosts.map((h) => ['logs-aws.cloudtrail-default', h]),
    });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { ...executeParams, row_limit: 50 },
      esClient
    );
    expect(result.behaviors[0].affected_hosts_truncated).toBe(true);
  });

  describe('host origins', () => {
    const ccsParams = { ...executeParams, allowed_indices: ['logs-aws.*', 'cluster_b:logs-aws.*'] };

    it('records where each affected host was seen, from the rows that named it', async () => {
      executeEsqlMock.mockResolvedValue({
        columns: [col('_index'), col('host.name')],
        values: [
          ['logs-aws.cloudtrail-default', 'web-1'],
          ['cluster_b:logs-aws.cloudtrail-default', 'web-1'],
          ['cluster_b:logs-aws.cloudtrail-default', 'ubuntu'],
        ],
      });
      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        ccsParams,
        esClient
      );

      expect(result.behaviors[0].affected_hosts).toEqual(['web-1', 'ubuntu']);
      expect(result.behaviors[0].affected_host_origins).toEqual([
        { name: 'web-1', local: true, remote_clusters: ['cluster_b'] },
        { name: 'ubuntu', local: false, remote_clusters: ['cluster_b'] },
      ]);
    });

    it('ignores rows outside the required scope when deciding a host origin', async () => {
      executeEsqlMock.mockResolvedValue({
        columns: [col('_index'), col('host.name')],
        values: [
          ['cluster_b:logs-aws.cloudtrail-default', 'ubuntu'],
          ['.alerts-security.alerts-default', 'ubuntu'],
        ],
      });
      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        ccsParams,
        esClient
      );

      expect(result.behaviors[0].affected_host_origins).toEqual([
        { name: 'ubuntu', local: false, remote_clusters: ['cluster_b'] },
      ]);
    });

    describe('when the rows hit the query cap', () => {
      const remoteAndLocalRows = {
        columns: [col('_index'), col('host.name')],
        values: [
          ['cluster_b:logs-aws.cloudtrail-default', 'ubuntu'],
          ['logs-aws.cloudtrail-default', 'web-1'],
        ],
      };

      it('keeps local origins and leaves remote-only ones unknown at row_limit', async () => {
        // The host's local rows may be past the cap, so "remote only" is not proven.
        executeEsqlMock.mockResolvedValue(remoteAndLocalRows);
        const result = await huntBehavior(
          buildMockModel([t1078Candidate]),
          logger,
          { ...ccsParams, row_limit: 2 },
          esClient
        );

        expect(result.behaviors[0].affected_hosts).toEqual(['ubuntu', 'web-1']);
        expect(result.behaviors[0].affected_host_origins).toEqual([
          { name: 'web-1', local: true, remote_clusters: [] },
        ]);
      });

      it('treats a generated LIMIT below row_limit as the cap', async () => {
        generateByTechnique({ 'T1078.004': GROUNDED_ESQL.replace('LIMIT 100', 'LIMIT 2') });
        executeEsqlMock.mockResolvedValue(remoteAndLocalRows);
        const result = await huntBehavior(
          buildMockModel([t1078Candidate]),
          logger,
          ccsParams,
          esClient
        );

        expect(result.behaviors[0].affected_host_origins).toEqual([
          { name: 'web-1', local: true, remote_clusters: [] },
        ]);
      });

      it('keeps a remote-only origin when the rows stopped short of the cap', async () => {
        executeEsqlMock.mockResolvedValue(remoteAndLocalRows);
        const result = await huntBehavior(
          buildMockModel([t1078Candidate]),
          logger,
          { ...ccsParams, row_limit: 3 },
          esClient
        );

        expect(result.behaviors[0].affected_host_origins).toEqual([
          { name: 'ubuntu', local: false, remote_clusters: ['cluster_b'] },
          { name: 'web-1', local: true, remote_clusters: [] },
        ]);
      });
    });

    it('omits host origins when no host was affected', async () => {
      executeEsqlMock.mockResolvedValue({
        columns: [col('_index')],
        values: [['logs-aws.cloudtrail-default']],
      });
      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        ccsParams,
        esClient
      );

      expect(result.behaviors[0].affected_host_origins).toBeUndefined();
    });
  });

  describe('a generated query that reads outside the hunt scope', () => {
    const OUT_OF_SCOPE_ESQL = 'FROM .kibana-secrets\n| LIMIT 10';

    beforeEach(() => {
      generateEsqlMock.mockResolvedValue({ query: OUT_OF_SCOPE_ESQL });
    });

    it('is not published as a proposed rule, so nothing stages it as grounded', async () => {
      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(result.behaviors[0].validated_esql).not.toContain('.kibana-secrets');
      expect(result.behaviors[0].execution?.executed).toBe(false);
      expect(executeEsqlMock).not.toHaveBeenCalled();
    });

    it('is still published when it stays inside the scope', async () => {
      generateEsqlMock.mockResolvedValue({ query: GROUNDED_ESQL });

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(result.behaviors[0].validated_esql).toContain(GROUNDED_ESQL);
    });

    it('gives generateEsql a probe client that refuses an out-of-scope schema probe', async () => {
      // `generateEsql`'s schema probe runs the model's FROM before the publish/execute gate,
      // so the client it probes on must enforce the same allowlist. The generator is mocked
      // here, so drive its client directly to prove the probe would be refused.
      await huntBehavior(buildMockModel([t1078Candidate]), logger, executeParams, esClient);

      const probeClient = generateEsqlMock.mock.calls[0][0].esClient;
      await expect(probeClient?.esql.query({ query: OUT_OF_SCOPE_ESQL })).rejects.toThrow(
        'refused to probe an out-of-scope generated query'
      );
    });

    it('gives generateEsql a probe client that lets an in-scope schema probe through', async () => {
      await huntBehavior(buildMockModel([t1078Candidate]), logger, executeParams, esClient);

      const probeClient = generateEsqlMock.mock.calls[0][0].esClient;
      await expect(
        probeClient?.esql.query({ query: 'FROM logs-aws.* | LIMIT 1' })
      ).resolves.toBeDefined();
    });
  });

  describe('report grounding', () => {
    it('drops a candidate whose evidence_quote is absent from the report text', async () => {
      const model = buildMockModel([
        {
          technique_id: 'T1566',
          evidence_quote: 'a quote absent from the body',
          llm_confidence: 0.9,
        },
      ]);
      const result = await huntBehavior(model, logger, { text: REPORT_TEXT }, esClient);
      expect(result.behaviors).toHaveLength(0);
      expect(result.status).toBe('no_behaviors_validated');
      expect(result.has_hit).toBe(false);
    });

    it('discards a generated query that filters on nothing from the report', async () => {
      // In scope, so it clears the source gate, but it filters on no report value at all.
      generateByTechnique({ 'T1078.004': 'FROM logs-aws.*\n| LIMIT 1' });
      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );
      expect(executeEsqlMock).not.toHaveBeenCalled();
      expect(result.behaviors[0].validated_esql).toContain('Grounded ES|QL generation unavailable');
      expect(result.behaviors[0].validated_esql).not.toContain('FROM ');
      expect(result.behaviors[0].execution).toEqual({
        executed: false,
        row_count: 0,
        hit: false,
        inconclusive_reason: 'query_ungrounded',
      });
      expect(result.has_hit).toBe(false);
      // The technique was never searched, so the run must say so rather than let
      // `has_hit: false` read as a clean environment for it.
      expect(result.incomplete).toContainEqual(
        expect.objectContaining({ reason: 'query_ungrounded', technique_id: 'T1078.004' })
      );
    });

    it('records a candidate dropped for an ungrounded quote as a coverage gap', async () => {
      const result = await huntBehavior(
        buildMockModel([
          {
            technique_id: 'T1566',
            evidence_quote: 'never written in the report',
            llm_confidence: 0.9,
          },
        ]),
        logger,
        { text: REPORT_TEXT }
      );

      expect(result.behaviors).toHaveLength(0);
      expect(result.incomplete).toContainEqual(
        expect.objectContaining({ reason: 'quote_ungrounded', technique_id: 'T1566' })
      );
    });
  });

  describe('the grounding retry', () => {
    const UNGROUNDED_ESQL = 'FROM logs-aws.*\n| LIMIT 1';

    // `generateByTechnique` keys on `nlQuery`, which is identical across the first call and
    // the retry, so these use `mockResolvedValueOnce`/`mockRejectedValueOnce` chains instead.

    it('rescues a behavior whose first query is ungrounded but whose retry grounds', async () => {
      generateEsqlMock
        .mockResolvedValueOnce({ query: UNGROUNDED_ESQL })
        .mockResolvedValueOnce({ query: GROUNDED_ESQL });

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      expect(result.behaviors[0].validated_esql).toContain(GROUNDED_ESQL);
      expect(executeEsqlMock).toHaveBeenCalledTimes(1);
    });

    it('keeps the placeholder as query_ungrounded when the retry is also ungrounded', async () => {
      generateEsqlMock
        .mockResolvedValueOnce({ query: UNGROUNDED_ESQL })
        .mockResolvedValueOnce({ query: 'FROM logs-aws.*\n| LIMIT 2' });

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      expect(result.behaviors[0].execution).toEqual({
        executed: false,
        row_count: 0,
        hit: false,
        inconclusive_reason: 'query_ungrounded',
      });
      expect(result.incomplete).toContainEqual(
        expect.objectContaining({
          reason: 'query_ungrounded',
          technique_id: 'T1078.004',
          detail: expect.stringContaining('no filtering predicate'),
        })
      );
      expect(executeEsqlMock).not.toHaveBeenCalled();
    });

    it('retries and discards a query that filters on an excluded IOC', async () => {
      const excluded = '169.254.169.254';
      const excludedQuery = `FROM logs-aws.*\n| WHERE source.ip == "${excluded}"\n| LIMIT 10`;
      generateEsqlMock
        .mockResolvedValueOnce({ query: excludedQuery })
        .mockResolvedValueOnce({ query: excludedQuery });

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        {
          ...executeParams,
          text: `${REPORT_TEXT} Metadata ${excluded} appeared in the article.`,
          excluded_iocs: [{ type: 'ip', value: excluded }],
        },
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      expect(generateEsqlMock.mock.calls[1][0].additionalInstructions).toEqual(
        expect.stringContaining('query filters on a value intel review rejected')
      );
      expect(result.behaviors[0].execution?.inconclusive_reason).toBe('query_ungrounded');
      expect(result.incomplete).toContainEqual(
        expect.objectContaining({
          reason: 'query_ungrounded',
          detail: expect.stringContaining('query filters on a value intel review rejected'),
        })
      );
      expect(executeEsqlMock).not.toHaveBeenCalled();
    });

    it('publishes a query that uses a field whose name collides with an excluded value', async () => {
      const fieldCollisionQuery = 'FROM logs-aws.*\n| WHERE process.name == "whoami"\n| LIMIT 10';
      generateEsqlMock.mockResolvedValueOnce({ query: fieldCollisionQuery });

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        {
          ...executeParams,
          text: `${REPORT_TEXT} whoami was observed on the host.`,
          excluded_iocs: [{ type: 'domain', value: 'process.name' }],
        },
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(1);
      expect(result.behaviors[0].validated_esql).toContain(fieldCollisionQuery);
      expect(result.behaviors[0].execution?.inconclusive_reason).not.toBe('query_ungrounded');
      expect(executeEsqlMock).toHaveBeenCalledTimes(1);
    });

    it('keeps the placeholder as query_ungrounded, not generation_failed, when the retry call errors', async () => {
      generateEsqlMock
        .mockResolvedValueOnce({ query: UNGROUNDED_ESQL })
        .mockResolvedValueOnce({ error: 'Unknown column [nope]' });

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      expect(result.behaviors[0].execution?.inconclusive_reason).toBe('query_ungrounded');
    });

    it('keeps the placeholder as query_ungrounded, not generation_failed, when the retry call throws', async () => {
      generateEsqlMock
        .mockResolvedValueOnce({ query: UNGROUNDED_ESQL })
        .mockRejectedValueOnce(new Error('Could not discover a suitable index'));

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      expect(result.behaviors[0].execution?.inconclusive_reason).toBe('query_ungrounded');
    });

    it('retries with the rejected query and gate reason, every other argument unchanged', async () => {
      generateEsqlMock
        .mockResolvedValueOnce({ query: UNGROUNDED_ESQL })
        .mockResolvedValueOnce({ query: GROUNDED_ESQL });

      await huntBehavior(buildMockModel([t1078Candidate]), logger, executeParams, esClient);

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = generateEsqlMock.mock.calls.map(([args]) => args);
      expect(secondCall.additionalInstructions?.startsWith(ESQL_GENERATION_INSTRUCTIONS)).toBe(
        true
      );
      expect(secondCall.additionalInstructions).toContain(UNGROUNDED_ESQL);
      expect(secondCall.additionalInstructions).toContain('no filtering predicate');
      expect(secondCall.nlQuery).toBe(firstCall.nlQuery);
      expect(secondCall.index).toBe(firstCall.index);
      expect(secondCall.additionalContext).toBe(firstCall.additionalContext);
      expect(secondCall.execute).toBe(firstCall.execute);
      expect(secondCall.rowLimit).toBe(firstCall.rowLimit);
      expect(secondCall.disableNamedParams).toBe(firstCall.disableNamedParams);
    });

    it('does not retry a first-call generation error', async () => {
      generateEsqlMock.mockResolvedValueOnce({ error: 'Unknown column [nope]' });

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(1);
      expect(result.behaviors[0].execution?.inconclusive_reason).toBe('generation_failed');
    });

    it('does not retry an out-of-scope first query, and logs no ungrounded-query debug line', async () => {
      generateByTechnique({ 'T1078.004': 'FROM .kibana-*\n| WHERE true\n| LIMIT 10' });
      const debugSpy = jest.spyOn(logger, 'debug');

      const result = await huntBehavior(
        buildMockModel([t1078Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(1);
      expect(result.behaviors[0].execution?.inconclusive_reason).toBe('query_out_of_scope');
      expect(debugSpy).not.toHaveBeenCalledWith(expect.stringContaining('ungrounded query'));
    });

    it.each(UNGROUNDED_QUERY_FIXTURES)(
      '$name: rescues through the real wrapper on the retry',
      async ({ reportText, evidenceQuote, iocValues, query, rewrittenQuery }) => {
        generateEsqlMock
          .mockResolvedValueOnce({ query })
          .mockResolvedValueOnce({ query: rewrittenQuery });

        const result = await huntBehavior(
          buildMockModel([{ ...t1078Candidate, evidence_quote: evidenceQuote }]),
          logger,
          {
            ...executeParams,
            text: reportText,
            iocs: iocValues.map((value) => ({ type: 'domain', value })),
          },
          esClient
        );

        expect(generateEsqlMock).toHaveBeenCalledTimes(2);
        expect(result.behaviors[0].validated_esql).toContain(rewrittenQuery);
        expect(result.incomplete?.some((i) => i.reason === 'query_ungrounded')).not.toBe(true);
      }
    );
  });

  describe('collapsing same-artifact behaviors', () => {
    const sharedIoc = { type: 'domain', value: 'evil.example.com' };
    const COLLAPSE_TEXT = `${REPORT_TEXT} Attackers used evil.example.com for both lateral movement and persistence.`;
    // A survivor query that filters on the shared artifact, so its siblings really are covered.
    // GROUNDED_ESQL grounds on `AssumeRole` instead, which clears the gate without hunting the
    // domain at all — the case a sibling must not be collapsed against.
    const COVERING_ESQL =
      'FROM logs-aws.cloudtrail-*\n| WHERE destination.domain == "evil.example.com"\n| LIMIT 10';
    const sharedCandidates = [
      {
        technique_id: 'T1078.004',
        evidence_quote: 'evil.example.com for both lateral movement',
        llm_confidence: 0.9,
      },
      {
        technique_id: 'T1566',
        evidence_quote: 'evil.example.com for both lateral movement and persistence',
        llm_confidence: 0.5,
      },
    ];

    it('generates the survivor first and the sibling in a second wave when budget remains', async () => {
      generateByTechnique({ 'T1078.004': COVERING_ESQL, T1566: COVERING_ESQL });

      const result = await huntBehavior(
        buildMockModel(sharedCandidates),
        logger,
        { ...executeParams, text: COLLAPSE_TEXT, iocs: [sharedIoc] },
        esClient
      );

      // Sharing an artifact set orders generation; it does not drop the second technique.
      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      expect(generateEsqlMock.mock.calls[0][0].nlQuery).toContain('T1078.004');
      expect(generateEsqlMock.mock.calls[1][0].nlQuery).toContain('T1566');

      const winner = result.behaviors.find((b) => b.technique_id === 'T1078.004');
      const sibling = result.behaviors.find((b) => b.technique_id === 'T1566');
      expect(winner?.validated_esql).toContain(COVERING_ESQL);
      expect(sibling?.validated_esql).toContain(COVERING_ESQL);
      expect(sibling?.execution?.inconclusive_reason).toBeUndefined();
      expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
    });

    it('generates the sibling in a second wave even when the survivor grounds on a different report literal', async () => {
      // The survivor's query clears the grounding gate on `AssumeRole`, never mentioning the
      // domain its sibling was deferred for. Budget remains, so the sibling generates either
      // way; this locks that nothing about the survivor's query can retire it while it does.
      generateByTechnique({ 'T1078.004': GROUNDED_ESQL, T1566: COVERING_ESQL });

      const result = await huntBehavior(
        buildMockModel(sharedCandidates),
        logger,
        { ...executeParams, text: COLLAPSE_TEXT, iocs: [sharedIoc] },
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      const sibling = result.behaviors.find((b) => b.technique_id === 'T1566');
      expect(sibling?.validated_esql).toContain(COVERING_ESQL);
      expect(sibling?.execution?.inconclusive_reason).toBeUndefined();
      expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
    });

    it('generates the sibling in a second wave when the survivor produced no usable query', async () => {
      // Only the sibling has a fixture; the survivor's generation errors out. The sibling's
      // generation does not depend on the survivor's outcome while budget remains.
      generateByTechnique({ T1566: COVERING_ESQL });

      const result = await huntBehavior(
        buildMockModel(sharedCandidates),
        logger,
        { ...executeParams, text: COLLAPSE_TEXT, iocs: [sharedIoc] },
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      const survivor = result.behaviors.find((b) => b.technique_id === 'T1078.004');
      const sibling = result.behaviors.find((b) => b.technique_id === 'T1566');
      expect(survivor?.execution?.inconclusive_reason).toBe('generation_failed');
      expect(sibling?.validated_esql).toContain(COVERING_ESQL);
      expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
    });

    it('discards a second-wave query that filters on an excluded IOC', async () => {
      // The survivor grounds on `AssumeRole`, so the sibling generates on its own in the second
      // wave. Generation-time and publish-time grounding both read the denylist (the first drives
      // the retry, the second discards), so the sibling keeps the placeholder and never executes.
      const excluded = '169.254.169.254';
      const EXCLUDED_ESQL = `FROM logs-aws.cloudtrail-*\n| WHERE source.ip == "${excluded}"\n| LIMIT 10`;
      generateByTechnique({ 'T1078.004': GROUNDED_ESQL, T1566: EXCLUDED_ESQL });

      const result = await huntBehavior(
        buildMockModel(sharedCandidates),
        logger,
        {
          ...executeParams,
          text: `${COLLAPSE_TEXT} The metadata endpoint ${excluded} appeared in the article.`,
          iocs: [sharedIoc],
          excluded_iocs: [{ type: 'ip', value: excluded }],
        },
        esClient
      );

      const sibling = result.behaviors.find((b) => b.technique_id === 'T1566');
      expect(sibling?.execution?.inconclusive_reason).toBe('query_ungrounded');
      expect(sibling?.validated_esql).not.toContain(EXCLUDED_ESQL);
      expect(result.incomplete).toContainEqual(
        expect.objectContaining({
          reason: 'query_ungrounded',
          detail: expect.stringContaining('intel review rejected'),
        })
      );
      // Only the survivor executed.
      expect(executeEsqlMock).toHaveBeenCalledTimes(1);
    });

    it('charges uncovered siblings to the generation budget when the first wave used it all', async () => {
      // 20 survivors fill the budget. Their queries ground on `AssumeRole`, so nothing searched
      // the two deferred siblings' artifacts, and no budget remains to generate them: they
      // report `generation_budget`, never `collapsed`, and no 21st generation call is made.
      const ids = [...enterpriseCatalog.techniqueById.keys()].slice(0, 22);
      const sharedQuote = 'evidence mentioning evil.example.com directly';
      generateEsqlMock.mockResolvedValue({ query: GROUNDED_ESQL });

      const candidates = ids.map((technique_id, index) => ({
        technique_id,
        evidence_quote: index < 3 ? sharedQuote : 'evidence',
        llm_confidence: 0.5 + index * 0.01,
      }));

      const result = await huntBehavior(
        buildMockModel(candidates),
        logger,
        { ...executeParams, text: `${REPORT_TEXT} ${sharedQuote}`, iocs: [sharedIoc] },
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(20);
      expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
      expect(result.incomplete?.filter((i) => i.reason === 'generation_budget')).toHaveLength(2);
    });

    it('does not collapse behaviors whose quotes name no shared artifact', async () => {
      const result = await huntBehavior(
        buildMockModel([t1078Candidate, t1566Candidate]),
        logger,
        executeParams,
        esClient
      );

      expect(generateEsqlMock).toHaveBeenCalledTimes(2);
      expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
    });

    it('does not collapse anything when no esClient is given', async () => {
      const result = await huntBehavior(
        buildMockModel([
          {
            technique_id: 'T1078.004',
            evidence_quote: 'evil.example.com for both lateral movement',
            llm_confidence: 0.9,
          },
          {
            technique_id: 'T1566',
            evidence_quote: 'evil.example.com for both lateral movement and persistence',
            llm_confidence: 0.5,
          },
        ]),
        logger,
        { text: COLLAPSE_TEXT, iocs: [sharedIoc] }
      );

      expect(generateEsqlMock).not.toHaveBeenCalled();
      expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
    });

    it('records collapsed only for a sibling that lost to the budget after its survivor searched its artifacts', async () => {
      const ids = [...enterpriseCatalog.techniqueById.keys()].slice(0, 22);
      const sharedQuote = 'evidence mentioning evil.example.com directly';
      generateEsqlMock.mockResolvedValue({ query: COVERING_ESQL });

      const candidates = ids.map((technique_id, index) => ({
        technique_id,
        // The first 3 ids share the artifact set and collapse to one survivor; the rest
        // are distinct behaviors with no shared artifact, so none of them merge.
        evidence_quote: index < 3 ? sharedQuote : 'evidence',
        llm_confidence: 0.5 + index * 0.01,
      }));

      const result = await huntBehavior(
        buildMockModel(candidates),
        logger,
        { ...executeParams, text: `${REPORT_TEXT} ${sharedQuote}`, iocs: [sharedIoc] },
        esClient
      );

      expect(result.behaviors).toHaveLength(22);
      // 20 survivors fill the budget first, so distinct artifact sets never lose a slot to a
      // duplicate. The 2 siblings then have no budget left; their survivor's query filters on
      // the shared domain, so they are `collapsed` rather than `generation_budget`.
      expect(generateEsqlMock).toHaveBeenCalledTimes(20);
      expect(result.incomplete?.some((i) => i.reason === 'generation_budget')).not.toBe(true);
      const collapsed = result.incomplete?.filter((i) => i.reason === 'collapsed') ?? [];
      expect(collapsed).toHaveLength(2);
      expect(collapsed[0].detail).toContain('evil.example.com');
      expect(collapsed[0].detail).toContain('reached its budget');
      const sibling = result.behaviors.find((b) => b.technique_id === collapsed[0].technique_id);
      expect(sibling?.execution).toEqual({
        executed: false,
        row_count: 0,
        hit: false,
        inconclusive_reason: 'collapsed',
      });
      // The sibling stays in both output arrays, exactly as a generation_budget behavior does.
      expect(result.indexed_behaviors.some((b) => b.technique_id === sibling?.technique_id)).toBe(
        true
      );
    });

    describe('when the survivor did not search the shared artifacts', () => {
      const sharedQuote = 'evidence mentioning evil.example.com directly';
      // 22 behaviors: the first 3 share an artifact set and collapse to one survivor, and the
      // other 19 are distinct. 20 survivors fill the budget, which leaves the 2 siblings to be
      // settled on what their survivor did.
      const buildSiblingCandidates = () =>
        [...enterpriseCatalog.techniqueById.keys()].slice(0, 22).map((technique_id, index) => ({
          technique_id,
          evidence_quote: index < 3 ? sharedQuote : 'evidence',
          llm_confidence: 0.5 + index * 0.01,
        }));

      const siblingParams = { text: `${REPORT_TEXT} ${sharedQuote}`, iocs: [sharedIoc] };

      beforeEach(() => {
        generateEsqlMock.mockResolvedValue({ query: COVERING_ESQL });
      });

      it('records generation_budget, not collapsed, when every execute fails', async () => {
        executeEsqlMock.mockRejectedValue(new Error('verification_exception'));

        const result = await huntBehavior(
          buildMockModel(buildSiblingCandidates()),
          logger,
          { ...executeParams, ...siblingParams },
          esClient
        );

        expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
        expect(result.incomplete?.filter((i) => i.reason === 'generation_budget')).toHaveLength(2);
        expect(result.incomplete?.filter((i) => i.reason === 'execute_failed')).toHaveLength(20);
        // Nothing searched the siblings' artifacts, so none of the 22 is reported as searched.
        expect(getSearchedTechniqueIds(result)).toEqual([]);
      });

      it('records generation_budget, not collapsed, when nothing could execute', async () => {
        const result = await huntBehavior(
          buildMockModel(buildSiblingCandidates()),
          logger,
          { text: siblingParams.text, iocs: siblingParams.iocs, allowed_indices: ['logs-aws.*'] },
          esClient
        );

        expect(executeEsqlMock).not.toHaveBeenCalled();
        expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
        expect(result.incomplete?.filter((i) => i.reason === 'generation_budget')).toHaveLength(2);
        expect(getSearchedTechniqueIds(result)).toEqual([]);
      });
    });

    it('does not mark siblings collapsed when their survivor is cut by the generation budget', async () => {
      // 20 high-confidence unique behaviors fill the budget. Three lower-confidence behaviors
      // (still above the 0.5 extraction floor) share one artifact; collapse keeps one survivor,
      // then that survivor misses the cut. The two siblings must not claim `collapsed` (nothing
      // hunted those artifacts).
      const ids = [...enterpriseCatalog.techniqueById.keys()].slice(0, 23);
      const sharedQuote = 'evidence mentioning evil.example.com directly';
      generateEsqlMock.mockResolvedValue({ query: GROUNDED_ESQL });

      const candidates = ids.map((technique_id, index) => ({
        technique_id,
        evidence_quote: index < 3 ? sharedQuote : 'evidence',
        // Shared group clears the extraction threshold but stays below every unique behavior.
        llm_confidence: index < 3 ? 0.5 + index * 0.01 : 0.7 + index * 0.01,
      }));

      const result = await huntBehavior(
        buildMockModel(candidates),
        logger,
        { ...executeParams, text: `${REPORT_TEXT} ${sharedQuote}`, iocs: [sharedIoc] },
        esClient
      );

      expect(result.behaviors).toHaveLength(23);
      expect(result.incomplete?.some((i) => i.reason === 'collapsed')).not.toBe(true);
      expect(result.incomplete?.filter((i) => i.reason === 'generation_budget')).toHaveLength(3);
      expect(generateEsqlMock).toHaveBeenCalledTimes(20);
    });
  });

  describe('the generation budget', () => {
    const GENERATION_BUDGET = 20;
    const OVER_BUDGET = GENERATION_BUDGET + 5;

    beforeEach(() => {
      // Every id resolves to a grounded query here, so the only reason a behavior
      // keeps its placeholder is the budget rather than a generation failure.
      generateEsqlMock.mockResolvedValue({ query: GROUNDED_ESQL });
    });

    /** Real catalog ids, so none are dropped as unknown before generation. */
    const catalogIds = () => [...enterpriseCatalog.techniqueById.keys()].slice(0, OVER_BUDGET);

    /** Ascending confidence, so the lowest-confidence ids are the ones over budget. */
    const ascendingCandidates = () =>
      catalogIds().map((technique_id, index) => ({
        technique_id,
        evidence_quote: 'evidence',
        llm_confidence: 0.5 + index * 0.02,
      }));

    const techniqueIdsSentToGeneration = () =>
      generateEsqlMock.mock.calls.map(([{ nlQuery }]) => nlQuery);

    it('bounds generation calls, so one report cannot spend unlimited LLM graphs', async () => {
      const result = await huntBehavior(
        buildMockModel(ascendingCandidates()),
        logger,
        executeParams,
        esClient
      );

      expect(result.behaviors).toHaveLength(OVER_BUDGET);
      expect(generateEsqlMock).toHaveBeenCalledTimes(GENERATION_BUDGET);
    });

    it('spends the budget on the highest-confidence behaviors', async () => {
      const ids = catalogIds();
      await huntBehavior(buildMockModel(ascendingCandidates()), logger, executeParams, esClient);

      const sent = techniqueIdsSentToGeneration();
      expect(sent.some((nlQuery) => nlQuery.includes(ids[OVER_BUDGET - 1]))).toBe(true);
      expect(sent.some((nlQuery) => nlQuery.includes(ids[0]))).toBe(false);
    });

    it('leaves the over-budget behaviors unexecuted, unlike the ones inside it', async () => {
      const ids = catalogIds();
      const result = await huntBehavior(
        buildMockModel(ascendingCandidates()),
        logger,
        executeParams,
        esClient
      );

      const overBudget = result.behaviors.find((b) => b.technique_id === ids[0]);
      const insideBudget = result.behaviors.find((b) => b.technique_id === ids[OVER_BUDGET - 1]);
      expect(overBudget?.execution?.executed).toBe(false);
      expect(insideBudget?.execution?.executed).toBe(true);
    });

    it('generates for every behavior when the report stays inside the budget', async () => {
      const candidates = ascendingCandidates().slice(0, GENERATION_BUDGET);

      await huntBehavior(buildMockModel(candidates), logger, executeParams, esClient);

      expect(generateEsqlMock).toHaveBeenCalledTimes(GENERATION_BUDGET);
    });

    it('names the techniques it left uncorroborated, so a partial run is not silent', async () => {
      const ids = catalogIds();
      const result = await huntBehavior(
        buildMockModel(ascendingCandidates()),
        logger,
        executeParams,
        esClient
      );

      // The lowest-confidence ids are the ones the budget cut.
      expect(
        result.incomplete
          ?.filter(({ reason }) => reason === 'generation_budget')
          .map(({ technique_id }) => technique_id)
      ).toEqual(ids.slice(0, OVER_BUDGET - GENERATION_BUDGET));
      expect(result.next_step).toContain('only partially hunted');
    });

    it('marks each budget-cut behavior inconclusive rather than leaving a bare placeholder', async () => {
      const result = await huntBehavior(
        buildMockModel(ascendingCandidates()),
        logger,
        executeParams,
        esClient
      );

      // Without a reason on the execution, a behavior the budget never reached looks
      // exactly like one whose query ran and matched nothing.
      const cut = catalogIds().slice(0, OVER_BUDGET - GENERATION_BUDGET);
      for (const techniqueId of cut) {
        const behavior = result.behaviors.find((b) => b.technique_id === techniqueId);
        expect(behavior?.execution).toEqual(
          expect.objectContaining({ executed: false, inconclusive_reason: 'generation_budget' })
        );
      }
    });

    it('reports nothing uncorroborated when the report stays inside the budget', async () => {
      const candidates = ascendingCandidates().slice(0, GENERATION_BUDGET);

      const result = await huntBehavior(
        buildMockModel(candidates),
        logger,
        executeParams,
        esClient
      );

      expect(result.incomplete).toBeUndefined();
      expect(result.next_step).not.toContain('partially hunted');
    });
  });
});
