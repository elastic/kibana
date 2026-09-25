/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { executeEsql, generateEsql } from '@kbn/agent-builder-genai-utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { huntBehavior } from './hunt_behavior';
import { ESQL_GENERATION_INSTRUCTIONS } from './extraction_contract';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
  executeEsql: jest.fn(),
}));

const generateEsqlMock = generateEsql as jest.MockedFunction<typeof generateEsql>;
const executeEsqlMock = executeEsql as jest.MockedFunction<typeof executeEsql>;

const GROUNDED_ESQL =
  'FROM logs-aws.cloudtrail-*\n| WHERE aws.cloudtrail.event_name == "AssumeRole"\n| KEEP host.name, user.name\n| LIMIT 100';
const T1566_ESQL = 'FROM logs-aws.*\n| WHERE email.from.address == "evil@example.com"\n| LIMIT 10';

/** Resolve a grounded query per technique id from the `nlQuery` the service builds. */
const generateByTechnique = (queries: Record<string, string>) =>
  generateEsqlMock.mockImplementation(async ({ nlQuery }) => {
    const match = Object.entries(queries).find(([id]) => nlQuery.includes(id));
    return match ? { query: match[1] } : { error: `no fixture for ${nlQuery}` };
  });

const buildMockModel = (
  candidates: Array<{ technique_id: string; evidence_quote: string; llm_confidence: number }> = []
): ScopedModel => {
  const withStructuredOutput = jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ candidates }),
  });
  return {
    chatModel: { withStructuredOutput } as unknown as ScopedModel['chatModel'],
    inferenceClient: {} as ScopedModel['inferenceClient'],
    connector: {} as ScopedModel['connector'],
  };
};

const esClient = {} as ElasticsearchClient;
const col = (name: string) => ({ name, type: 'keyword' });
const logger = loggingSystemMock.createLogger();

const t1078Candidate = {
  technique_id: 'T1078.004',
  evidence_quote: 'cloud account abuse via AssumeRole',
  llm_confidence: 0.9,
};
const t1566Candidate = { technique_id: 'T1566', evidence_quote: 'phishing', llm_confidence: 0.9 };

const executeParams = {
  text: 'report',
  window: { from: 'now-30d', to: 'now' },
  required_indices: ['logs-aws.*'],
  row_limit: 25,
};

describe('huntBehavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateByTechnique({ 'T1078.004': GROUNDED_ESQL, T1566: T1566_ESQL });
    executeEsqlMock.mockResolvedValue({ columns: [], values: [] });
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
      text: 'report text',
      llm_confidence_threshold: 0.5,
    });
    expect(result.status).toBe('no_behaviors_found');
  });

  it('returns behaviors_proposed for a catalog technique id', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
      { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
    ]);
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.status).toBe('behaviors_proposed');
  });

  it('returns only the catalog-validated technique', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
      { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
    ]);
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.behaviors).toHaveLength(1);
  });

  it('returns the dropped unknown technique id', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
      { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
    ]);
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.dropped_unknown_ids).toContain('T9999999');
  });

  it('returns indexed_behaviors id as reportId:techniqueId', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing', llm_confidence: 0.8 },
    ]);
    const result = await huntBehavior(model, logger, { text: 'report', report_id: 'rpt-001' });
    expect(result.indexed_behaviors[0].id).toBe('rpt-001:T1566');
  });

  it('returns indexed_behaviors with a technique_id', async () => {
    const model = buildMockModel([
      { technique_id: 'T1566', evidence_quote: 'spear phishing', llm_confidence: 0.8 },
    ]);
    const result = await huntBehavior(model, logger, { text: 'report', report_id: 'rpt-001' });
    expect(result.indexed_behaviors[0].technique_id).toBe('T1566');
  });

  it('returns a non-executable placeholder without calling generateEsql when no esClient is given', async () => {
    const result = await huntBehavior(buildMockModel([t1078Candidate]), logger, { text: 'report' });
    expect(generateEsqlMock).not.toHaveBeenCalled();
    expect(result.behaviors[0].proposed_esql_rule).toContain(
      'Grounded ES|QL generation unavailable'
    );
    expect(result.behaviors[0].proposed_esql_rule).not.toContain('FROM ');
  });

  it('returns one generateEsql call per validated behavior', async () => {
    const model = buildMockModel([t1078Candidate, t1566Candidate]);
    await huntBehavior(model, logger, { text: 'report' }, esClient);
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
      { text: 'report', report_id: 'rpt-1' },
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
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.behaviors).toEqual([
      expect.objectContaining({ evidence_quote: 'stronger quote', llm_confidence: 0.95 }),
    ]);
  });

  it('returns generateEsql targeting only allowlisted matched indices', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      {
        text: 'report',
        required_indices: ['logs-aws.*'],
        article_context: {
          matched_indices: [
            '.ds-logs-aws.cloudtrail-default-2026.09.01-000001',
            '.kibana',
            'logs-okta.system-default',
          ],
        },
      },
      esClient
    );
    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'logs-aws.cloudtrail-default*' })
    );
  });

  it('returns generateEsql targeting the integrations that produced Tier 1 hits', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      {
        text: 'report',
        required_indices: ['logs-*'],
        article_context: {
          matched_indices: [
            '.ds-logs-aws.cloudtrail-default-2026.09.01-000001',
            '.ds-logs-aws.cloudtrail-default-2026.09.02-000002',
            'logs-okta.system-default',
          ],
        },
      },
      esClient
    );
    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'logs-aws.cloudtrail-default*,logs-okta.system-default*' })
    );
  });

  it('returns generateEsql targeting the required indices when Tier 1 had no hits', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: 'report', required_indices: ['logs-aws.*', 'logs-okta.*'] },
      esClient
    );
    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'logs-aws.*,logs-okta.*' })
    );
  });

  it('returns generateEsql targeting logs-* when neither hits nor scope name an index', async () => {
    await huntBehavior(buildMockModel([t1078Candidate]), logger, { text: 'report' }, esClient);
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
    await huntBehavior(buildMockModel([t1078Candidate]), logger, { text: 'report' }, esClient);
    const { nlQuery } = generateEsqlMock.mock.calls[0][0];
    expect(nlQuery).toContain('T1078.004');
    expect(nlQuery).toContain('cloud account abuse via AssumeRole');
  });

  it('returns the extracted IOCs and report text as generateEsql context', async () => {
    await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: 'the report body', iocs: [{ type: 'ip', value: '203.0.113.7' }] },
      esClient
    );
    const { additionalContext } = generateEsqlMock.mock.calls[0][0];
    expect(additionalContext).toContain('ip: 203.0.113.7');
    expect(additionalContext).toContain('the report body');
  });

  it('returns the generated query under the grounded header as the proposed rule', async () => {
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: 'report' },
      esClient
    );
    const rule = result.behaviors[0].proposed_esql_rule;
    expect(rule.startsWith('// Generated from hunt.hunt_behavior')).toBe(true);
    expect(rule.endsWith(`\n${GROUNDED_ESQL}`)).toBe(true);
  });

  it('returns a non-executable placeholder when generateEsql reports an error', async () => {
    generateEsqlMock.mockResolvedValue({ error: 'Unknown column [nope]' });
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      executeParams,
      esClient
    );
    expect(result.behaviors[0].proposed_esql_rule).toContain(
      'Grounded ES|QL generation unavailable'
    );
    expect(result.behaviors[0].proposed_esql_rule).not.toContain('FROM ');
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
    expect(result.behaviors[0].proposed_esql_rule).toContain(
      'Grounded ES|QL generation unavailable'
    );
    expect(result.behaviors[0].proposed_esql_rule).not.toContain('FROM ');
    expect(result.status).toBe('behaviors_proposed');
  });

  it('returns has_hit false when no window is provided (validate only)', async () => {
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: 'report', required_indices: ['logs-aws.*'], row_limit: 25 },
      esClient
    );
    expect(result.has_hit).toBe(false);
  });

  it('returns executed false and no execute call when no window is provided', async () => {
    const result = await huntBehavior(
      buildMockModel([t1078Candidate]),
      logger,
      { text: 'report', required_indices: ['logs-aws.*'], row_limit: 25 },
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
    expect(result.behaviors[0].execution).toEqual({ executed: true, row_count: 1, hit: true });
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
    });
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
});
