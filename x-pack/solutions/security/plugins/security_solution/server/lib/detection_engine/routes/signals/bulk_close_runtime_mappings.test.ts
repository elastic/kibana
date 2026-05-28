/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import {
  resolveDataViewIndices,
  resolveIndicesForRule,
  resolveRuntimeMappingsFromIndices,
  buildSourceReadingRuntimeField,
} from './bulk_close_runtime_mappings';
import { getRuleByRuleId } from '../../rule_management/logic/detection_rules_client/methods/get_rule_by_rule_id';

jest.mock('../../rule_management/logic/detection_rules_client/methods/get_rule_by_rule_id');

const mockGetRuleByRuleId = getRuleByRuleId as jest.MockedFunction<typeof getRuleByRuleId>;

describe('buildSourceReadingRuntimeField', () => {
  // Snapshot the script body so any change to it surfaces in review. The
  // bulk-close path attaches this script to `_update_by_query` and the
  // alerting framework's `missingFields` merge strategy is what makes it
  // resolve to a real value — both contracts depend on the exact shape.
  it('produces a stable script for a scalar runtime field type', () => {
    expect(buildSourceReadingRuntimeField('source.ip_ecs', 'ip')).toMatchSnapshot();
  });

  it('carries the field name through unchanged into script params', () => {
    const result = buildSourceReadingRuntimeField('some.nested.field', 'keyword');
    expect(result.script).toMatchObject({ params: { fieldName: 'some.nested.field' } });
    expect(result.type).toBe('keyword');
  });
});

describe('resolveRuntimeMappingsFromIndices', () => {
  const setup = () => ({
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    logger: loggingSystemMock.createLogger(),
  });

  it('returns undefined when no indices are supplied', async () => {
    const { esClient, logger } = setup();
    expect(await resolveRuntimeMappingsFromIndices(esClient, [], logger)).toBeUndefined();
    expect(await resolveRuntimeMappingsFromIndices(esClient, undefined, logger)).toBeUndefined();
    expect(esClient.indices.getMapping).not.toHaveBeenCalled();
  });

  it('returns undefined when the indices have no runtime mappings', async () => {
    const { esClient, logger } = setup();
    esClient.indices.getMapping.mockResolvedValue({
      'my-index': { mappings: { properties: { '@timestamp': { type: 'date' } } } },
    });
    expect(await resolveRuntimeMappingsFromIndices(esClient, ['my-index'], logger)).toBeUndefined();
  });

  it('builds a runtime field per name when one index declares them', async () => {
    const { esClient, logger } = setup();
    esClient.indices.getMapping.mockResolvedValue({
      'my-index': {
        mappings: {
          runtime: {
            'source.ip_ecs': { type: 'ip', script: { source: 'emit("ignored")' } },
          },
        },
      },
    });
    const result = await resolveRuntimeMappingsFromIndices(esClient, ['my-index'], logger);
    expect(result).toMatchObject({
      'source.ip_ecs': {
        type: 'ip',
        script: { params: { fieldName: 'source.ip_ecs' } },
      },
    });
    // The script we built must NOT echo the user's original script.
    expect(JSON.stringify(result)).not.toContain('emit("ignored")');
  });

  it('merges runtime fields across multiple indices (no overlap)', async () => {
    const { esClient, logger } = setup();
    esClient.indices.getMapping.mockResolvedValue({
      'index-a': {
        mappings: { runtime: { 'source.ip_ecs': { type: 'ip', script: { source: '' } } } },
      },
      'index-b': {
        mappings: { runtime: { 'user.tag': { type: 'keyword', script: { source: '' } } } },
      },
    });
    const result = await resolveRuntimeMappingsFromIndices(
      esClient,
      ['index-a', 'index-b'],
      logger
    );
    expect(Object.keys(result ?? {}).sort()).toEqual(['source.ip_ecs', 'user.tag']);
    expect(result?.['source.ip_ecs']?.type).toBe('ip');
    expect(result?.['user.tag']?.type).toBe('keyword');
  });

  it('logs a warning and falls back to last-write-wins on a type conflict', async () => {
    const { esClient, logger } = setup();
    esClient.indices.getMapping.mockResolvedValue({
      'index-a': {
        mappings: { runtime: { 'source.ip_ecs': { type: 'ip', script: { source: '' } } } },
      },
      'index-b': {
        mappings: { runtime: { 'source.ip_ecs': { type: 'keyword', script: { source: '' } } } },
      },
    });
    const result = await resolveRuntimeMappingsFromIndices(
      esClient,
      ['index-a', 'index-b'],
      logger
    );
    // Last entry seen (`index-b` -> keyword) wins.
    expect(result?.['source.ip_ecs']?.type).toBe('keyword');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const message = (logger.warn as jest.Mock).mock.calls[0][0];
    expect(message).toContain('source.ip_ecs');
    expect(message).toContain('index-a');
    expect(message).toContain('index-b');
    expect(message).toContain('ip');
    expect(message).toContain('keyword');
  });

  it('returns undefined and logs when getMapping throws (missing/unauthorised)', async () => {
    const { esClient, logger } = setup();
    esClient.indices.getMapping.mockRejectedValue(new Error('forbidden'));
    expect(
      await resolveRuntimeMappingsFromIndices(esClient, ['locked-index'], logger)
    ).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to resolve runtime mappings')
    );
  });
});

describe('resolveIndicesForRule', () => {
  const setup = () => ({
    rulesClient: rulesClientMock.create(),
    savedObjectsClient: savedObjectsClientMock.create(),
    logger: loggingSystemMock.createLogger(),
  });

  beforeEach(() => {
    mockGetRuleByRuleId.mockReset();
  });

  it('returns the rule.index array verbatim for a custom query rule', async () => {
    const { rulesClient, savedObjectsClient, logger } = setup();
    mockGetRuleByRuleId.mockResolvedValue({
      type: 'query',
      index: ['logs-*', 'auditbeat-*'],
    } as never);
    await expect(
      resolveIndicesForRule(rulesClient, savedObjectsClient, 'r1', logger)
    ).resolves.toEqual(['logs-*', 'auditbeat-*']);
  });

  it('returns the ML anomalies wildcard for an ML rule', async () => {
    const { rulesClient, savedObjectsClient, logger } = setup();
    mockGetRuleByRuleId.mockResolvedValue({
      type: 'machine_learning',
      machine_learning_job_id: ['job-1'],
    } as never);
    await expect(
      resolveIndicesForRule(rulesClient, savedObjectsClient, 'r1', logger)
    ).resolves.toEqual(['.ml-anomalies-*']);
  });

  it('prefers data_view_id over rule.index when both are present', async () => {
    const { rulesClient, savedObjectsClient, logger } = setup();
    mockGetRuleByRuleId.mockResolvedValue({
      type: 'query',
      data_view_id: 'dv-1',
      index: ['logs-*'],
    } as never);
    savedObjectsClient.get.mockResolvedValue({
      id: 'dv-1',
      type: 'index-pattern',
      attributes: { title: 'logs-app-*,metrics-*' },
      references: [],
    } as never);
    await expect(
      resolveIndicesForRule(rulesClient, savedObjectsClient, 'r1', logger)
    ).resolves.toEqual(['logs-app-*', 'metrics-*']);
    expect(savedObjectsClient.get).toHaveBeenCalledWith('index-pattern', 'dv-1');
  });

  it('parses the index list from the ES|QL query for ESQL rules', async () => {
    const { rulesClient, savedObjectsClient, logger } = setup();
    mockGetRuleByRuleId.mockResolvedValue({
      type: 'esql',
      query: 'FROM logs-* METADATA _id, _index | WHERE event.action == "logon"',
    } as never);
    await expect(
      resolveIndicesForRule(rulesClient, savedObjectsClient, 'r1', logger)
    ).resolves.toEqual(['logs-*']);
  });

  it('returns [] for unknown / unhandled rule shapes', async () => {
    const { rulesClient, savedObjectsClient, logger } = setup();
    mockGetRuleByRuleId.mockResolvedValue({ type: 'some_new_type' } as never);
    await expect(
      resolveIndicesForRule(rulesClient, savedObjectsClient, 'r1', logger)
    ).resolves.toEqual([]);
  });

  it('returns [] and logs when the rule cannot be loaded', async () => {
    const { rulesClient, savedObjectsClient, logger } = setup();
    mockGetRuleByRuleId.mockRejectedValue(new Error('not found'));
    await expect(
      resolveIndicesForRule(rulesClient, savedObjectsClient, 'missing-rule', logger)
    ).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to load rule_id "missing-rule"')
    );
  });
});

describe('resolveDataViewIndices', () => {
  const setup = () => ({
    savedObjectsClient: savedObjectsClientMock.create(),
    logger: loggingSystemMock.createLogger(),
  });

  it('splits the CSV title into trimmed, non-empty patterns', async () => {
    const { savedObjectsClient, logger } = setup();
    savedObjectsClient.get.mockResolvedValue({
      id: 'dv-1',
      type: 'index-pattern',
      // Mixed whitespace + an empty segment to ensure the helper trims and
      // drops empties (a hand-edited data view can produce these).
      attributes: { title: 'logs-app-* ,  metrics-*,, traces-*' },
      references: [],
    } as never);
    await expect(resolveDataViewIndices(savedObjectsClient, 'dv-1', 'r1', logger)).resolves.toEqual(
      ['logs-app-*', 'metrics-*', 'traces-*']
    );
  });

  it('returns [] and logs when the saved-object fetch fails', async () => {
    const { savedObjectsClient, logger } = setup();
    savedObjectsClient.get.mockRejectedValue(new Error('forbidden'));
    await expect(resolveDataViewIndices(savedObjectsClient, 'dv-1', 'r1', logger)).resolves.toEqual(
      []
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to load data view "dv-1" for rule_id "r1"')
    );
  });
});
