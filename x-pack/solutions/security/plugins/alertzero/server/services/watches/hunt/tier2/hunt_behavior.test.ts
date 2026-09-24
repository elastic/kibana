/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { huntBehavior } from './hunt_behavior';
import {
  huntBehaviorLlmExtractionSchema,
  huntBehaviorEsqlGenerationSchema,
} from './extraction_contract';

const GROUNDED_ESQL =
  'FROM logs-aws.cloudtrail-*\n| WHERE aws.cloudtrail.event_name == "AssumeRole"\n| KEEP host.name, user.name\n| LIMIT 100';

const buildMockModel = ({
  extractionResult = {},
  esqlRules,
}: {
  extractionResult?: Partial<{
    candidates: Array<{ technique_id: string; evidence_quote: string; llm_confidence: number }>;
  }>;
  esqlRules?: Array<{ technique_id: string; esql: string }>;
} = {}): ScopedModel => {
  const withStructuredOutput = jest.fn().mockImplementation((schema) => {
    if (schema === huntBehaviorLlmExtractionSchema) {
      return {
        invoke: jest.fn().mockResolvedValue({ candidates: extractionResult.candidates ?? [] }),
      };
    }
    if (schema === huntBehaviorEsqlGenerationSchema) {
      return {
        invoke: jest.fn().mockResolvedValue({
          rules: esqlRules ?? [{ technique_id: 'T1078.004', esql: GROUNDED_ESQL }],
        }),
      };
    }
    return { invoke: jest.fn().mockResolvedValue({}) };
  });

  return {
    chatModel: { withStructuredOutput } as unknown as ScopedModel['chatModel'],
    inferenceClient: {} as ScopedModel['inferenceClient'],
    connector: {} as ScopedModel['connector'],
  };
};

const logger = loggingSystemMock.createLogger();

const t1078Candidate = {
  technique_id: 'T1078.004',
  evidence_quote: 'cloud account abuse via AssumeRole',
  llm_confidence: 0.9,
};

describe('huntBehavior', () => {
  it('returns no_behaviors_found when LLM extracts nothing', async () => {
    const model = buildMockModel({ extractionResult: { candidates: [] } });
    const result = await huntBehavior(model, logger, { text: 'some report text' });
    expect(result.status).toBe('no_behaviors_found');
  });

  it('returns hasHit false when LLM extracts nothing', async () => {
    const model = buildMockModel({ extractionResult: { candidates: [] } });
    const result = await huntBehavior(model, logger, { text: 'some report text' });
    expect(result.hasHit).toBe(false);
  });

  it('returns no_behaviors_found when candidates are below the confidence threshold', async () => {
    const model = buildMockModel({
      extractionResult: {
        candidates: [
          { technique_id: 'T1566', evidence_quote: 'phishing email', llm_confidence: 0.3 },
        ],
      },
    });
    const result = await huntBehavior(model, logger, {
      text: 'report text',
      llm_confidence_threshold: 0.5,
    });
    expect(result.status).toBe('no_behaviors_found');
  });

  it('returns behaviors_proposed for a catalog technique id', async () => {
    const model = buildMockModel({
      extractionResult: {
        candidates: [
          { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
          { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
        ],
      },
      esqlRules: [],
    });
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.status).toBe('behaviors_proposed');
  });

  it('returns only the catalog-validated technique', async () => {
    const model = buildMockModel({
      extractionResult: {
        candidates: [
          { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
          { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
        ],
      },
      esqlRules: [],
    });
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.behaviors).toHaveLength(1);
  });

  it('returns the dropped unknown technique id', async () => {
    const model = buildMockModel({
      extractionResult: {
        candidates: [
          { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
          { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
        ],
      },
      esqlRules: [],
    });
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.dropped_unknown_ids).toContain('T9999999');
  });

  it('returns indexed_behaviors id as reportId:techniqueId', async () => {
    const model = buildMockModel({
      extractionResult: {
        candidates: [
          { technique_id: 'T1566', evidence_quote: 'spear phishing', llm_confidence: 0.8 },
        ],
      },
      esqlRules: [],
    });
    const result = await huntBehavior(model, logger, {
      text: 'report',
      report_id: 'rpt-001',
    });
    expect(result.indexed_behaviors[0].id).toBe('rpt-001:T1566');
  });

  it('returns hasHit false when no window is provided (dry-run only)', async () => {
    const esClient = {
      esql: {
        query: jest.fn().mockResolvedValue({ columns: [], values: [] }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(result.hasHit).toBe(false);
  });

  it('returns executed false when no window is provided', async () => {
    const esClient = {
      esql: {
        query: jest.fn().mockResolvedValue({ columns: [], values: [] }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(result.behaviors[0].execution).toEqual({
      executed: false,
      row_count: 0,
      hit: false,
    });
  });

  it('returns hasHit true when a required-index row is returned', async () => {
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ columns: [], values: [] }) // dry-run
          .mockResolvedValueOnce({
            columns: [{ name: '_index' }, { name: 'host.name' }, { name: 'user.name' }],
            values: [['logs-aws.cloudtrail-default', 'WIN-ANALYST01', 'alice']],
          }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(result.hasHit).toBe(true);
  });

  it('returns execution.hit true for a required-index row', async () => {
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ columns: [], values: [] })
          .mockResolvedValueOnce({
            columns: [{ name: '_index' }, { name: 'host.name' }],
            values: [['logs-aws.cloudtrail-default', 'WIN-ANALYST01']],
          }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(result.behaviors[0].execution).toEqual({
      executed: true,
      row_count: 1,
      hit: true,
    });
  });

  it('returns hasHit false when only optional-index rows are returned', async () => {
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ columns: [], values: [] })
          .mockResolvedValueOnce({
            columns: [{ name: '_index' }],
            values: [['.alerts-security.alerts-default']],
          }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(result.hasHit).toBe(false);
  });

  it('returns the hunt window as the ES|QL filter on execute', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ columns: [], values: [] })
      .mockResolvedValueOnce({ columns: [{ name: '_index' }], values: [] });
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-7d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        filter: { range: { '@timestamp': { gte: 'now-7d', lte: 'now' } } },
      }),
      expect.objectContaining({ requestTimeout: '30s' })
    );
  });

  it('returns executed false for a behavior whose execute throws without failing siblings', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ columns: [], values: [] }) // dry-run T1078
      .mockRejectedValueOnce(new Error('timeout')) // execute T1078
      .mockResolvedValueOnce({ columns: [], values: [] }) // dry-run T1566
      .mockResolvedValueOnce({
        columns: [{ name: '_index' }],
        values: [['logs-aws.cloudtrail-default']],
      });
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: {
        candidates: [
          t1078Candidate,
          { technique_id: 'T1566', evidence_quote: 'phishing', llm_confidence: 0.9 },
        ],
      },
      esqlRules: [
        { technique_id: 'T1078.004', esql: GROUNDED_ESQL },
        {
          technique_id: 'T1566',
          esql: 'FROM logs-aws.*\n| WHERE true\n| LIMIT 10',
        },
      ],
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(result.behaviors.find((b) => b.technique_id === 'T1078.004')?.execution).toEqual({
      executed: false,
      row_count: 0,
      hit: false,
    });
  });

  it('returns hasHit true when a sibling behavior hits after another throws', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ columns: [], values: [] })
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ columns: [], values: [] })
      .mockResolvedValueOnce({
        columns: [{ name: '_index' }],
        values: [['logs-aws.cloudtrail-default']],
      });
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: {
        candidates: [
          t1078Candidate,
          { technique_id: 'T1566', evidence_quote: 'phishing', llm_confidence: 0.9 },
        ],
      },
      esqlRules: [
        { technique_id: 'T1078.004', esql: GROUNDED_ESQL },
        {
          technique_id: 'T1566',
          esql: 'FROM logs-aws.*\n| WHERE true\n| LIMIT 10',
        },
      ],
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(result.hasHit).toBe(true);
  });

  it('returns dry-run-only when the dry-run fails (no execute call)', async () => {
    const query = jest.fn().mockRejectedValue(new Error('Unknown column [nope]'));
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(result.hasHit).toBe(false);
  });

  it('returns indexed_behaviors with a technique_id', async () => {
    const model = buildMockModel({
      extractionResult: {
        candidates: [
          { technique_id: 'T1566', evidence_quote: 'spear phishing', llm_confidence: 0.8 },
        ],
      },
      esqlRules: [],
    });
    const result = await huntBehavior(model, logger, {
      text: 'report',
      report_id: 'rpt-001',
    });
    expect(result.indexed_behaviors[0].technique_id).toBe('T1566');
  });

  it('returns hasHit false when rows lack an _index column', async () => {
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ columns: [], values: [] })
          .mockResolvedValueOnce({
            columns: [{ name: 'count' }],
            values: [[3]],
          }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(result.hasHit).toBe(false);
  });

  it('returns a warning when rows lack an _index column', async () => {
    const warn = jest.spyOn(logger, 'warn');
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ columns: [], values: [] })
          .mockResolvedValueOnce({
            columns: [{ name: 'count' }],
            values: [[3]],
          }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 25,
      },
      esClient
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no _index column'));
  });

  it('returns LIMIT rewritten from size when size wins over row_limit', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ columns: [], values: [] })
      .mockResolvedValueOnce({ columns: [{ name: '_index' }], values: [] });
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 100,
        size: 7,
      },
      esClient
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: expect.stringMatching(/\|\s*LIMIT 7\b/),
      }),
      expect.anything()
    );
  });

  it('returns affected_hosts_truncated when more than 20 hosts are present', async () => {
    const hosts = Array.from({ length: 21 }, (_, i) => `host-${i}`);
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ columns: [], values: [] })
          .mockResolvedValueOnce({
            columns: [{ name: '_index' }, { name: 'host.name' }],
            values: hosts.map((h) => ['logs-aws.cloudtrail-default', h]),
          }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 50,
      },
      esClient
    );
    expect(result.behaviors[0].affected_hosts).toHaveLength(20);
  });

  it('returns the truncation flag when more than 20 hosts are present', async () => {
    const hosts = Array.from({ length: 21 }, (_, i) => `host-${i}`);
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ columns: [], values: [] })
          .mockResolvedValueOnce({
            columns: [{ name: '_index' }, { name: 'host.name' }],
            values: hosts.map((h) => ['logs-aws.cloudtrail-default', h]),
          }),
      },
    } as unknown as ElasticsearchClient;
    const model = buildMockModel({
      extractionResult: { candidates: [t1078Candidate] },
    });
    const result = await huntBehavior(
      model,
      logger,
      {
        text: 'report',
        window: { from: 'now-30d', to: 'now' },
        required_indices: ['logs-aws.*'],
        row_limit: 50,
      },
      esClient
    );
    expect(result.behaviors[0].affected_hosts_truncated).toBe(true);
  });
});
