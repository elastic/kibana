/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { errors } from '@elastic/elasticsearch';
import { getPrebuiltRuleMock } from '../../../detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset.mock';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { ElserPopulateError } from '../../common/data/elser_populate_error';
import {
  RuleMigrationsDataPrebuiltRulesClient,
  type PrebuildRuleVersionsMap,
} from './rule_migrations_data_prebuilt_rules_client';
import { getPrebuiltRulesFieldMap } from './field_maps';
import * as indexUtils from './utils/ensure_index';
import * as inferenceUtils from './utils/resolve_elser_inference_id';

describe('RuleMigrationsDataPrebuiltRulesClient', () => {
  const esScopedClient = elasticsearchServiceMock.createScopedClusterClient();
  const esClient = esScopedClient.asInternalUser;
  const logger = loggingSystemMock.createLogger();
  const ensureIndex = jest.spyOn(indexUtils, 'ensureIndex');
  const client = new RuleMigrationsDataPrebuiltRulesClient(
    async () => 'prebuilt-index',
    securityServiceMock.createMockAuthenticatedUser(),
    esScopedClient,
    logger,
    {} as SiemMigrationsClientDependencies,
    { kibanaVersion: '9.6.0', pluginStop$: new Subject<void>() }
  );
  const rule = getPrebuiltRuleMock();
  const versions: PrebuildRuleVersionsMap = new Map([[rule.rule_id, { target: rule }]]);

  beforeEach(() => {
    jest.clearAllMocks();
    ensureIndex.mockReset().mockResolvedValue(undefined);
    jest.spyOn(inferenceUtils, 'resolveElserInferenceId').mockResolvedValue('resolved-elser');
    esClient.bulk.mockResolvedValue({ errors: false, items: [], took: 1 });
  });

  it('replaces complete documents with stable IDs after preparing the index', async () => {
    ensureIndex.mockImplementationOnce(async () => {
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
    await client.populate(versions);
    await client.populate(versions);

    expect(ensureIndex).toHaveBeenCalledTimes(2);
    expect(inferenceUtils.resolveElserInferenceId).toHaveBeenCalledWith(esClient, undefined);
    expect(ensureIndex).toHaveBeenLastCalledWith(
      expect.objectContaining({
        esClient,
        fieldMap: getPrebuiltRulesFieldMap({ elserInferenceId: 'resolved-elser' }),
      })
    );
    expect(esClient.bulk).toHaveBeenCalledTimes(2);
    expect(esClient.bulk).toHaveBeenLastCalledWith(
      {
        refresh: 'wait_for',
        operations: [
          { index: { _index: 'prebuilt-index', _id: rule.rule_id } },
          {
            rule_id: rule.rule_id,
            name: rule.name,
            description: rule.description,
            elser_embedding: `${rule.name} - ${rule.description}`,
            '@timestamp': expect.any(String),
          },
        ],
      },
      { requestTimeout: 600000 }
    );
  });

  it('keeps batches of 500 rules and prepares the index once', async () => {
    const rules: PrebuildRuleVersionsMap = new Map(
      Array.from({ length: 501 }, (_, index) => {
        const ruleId = `rule-${index}`;
        return [ruleId, { target: { ...rule, rule_id: ruleId } }];
      })
    );
    await client.populate(rules);
    expect(ensureIndex).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledTimes(2);
    expect(esClient.bulk.mock.calls[0][0]?.operations).toHaveLength(1000);
    expect(esClient.bulk.mock.calls[1][0]?.operations).toHaveLength(2);
  });

  it('skips preparation when no target rules exist', async () => {
    await client.populate(new Map([[rule.rule_id, {}]]));
    expect(ensureIndex).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('retries population after index preparation fails', async () => {
    ensureIndex.mockRejectedValueOnce(new Error('Preparation failed'));
    await expect(client.populate(versions)).rejects.toThrow('Preparation failed');
    expect(esClient.bulk).not.toHaveBeenCalled();
    await client.populate(versions);
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('preserves bulk index error classification', async () => {
    esClient.bulk.mockResolvedValueOnce({
      errors: true,
      took: 1,
      items: [
        {
          index: {
            _index: 'prebuilt-index',
            status: 429,
            error: { type: 'es_rejected_execution_exception', reason: 'Busy' },
          },
        },
      ],
    });
    await expect(client.populate(versions)).rejects.toEqual(
      new ElserPopulateError('Busy', 'es_rejected_execution_exception')
    );
  });

  it('returns empty search results when the lookup index is absent', async () => {
    esClient.search.mockRejectedValueOnce(
      new errors.ResponseError({
        body: { error: { type: 'index_not_found_exception', index: 'prebuilt-index' } },
        statusCode: 404,
        warnings: [],
        meta: {
          context: null,
          name: 'test',
          request: {
            id: 1,
            params: { method: 'GET', path: '/', headers: {}, querystring: '' },
            options: {},
          },
          connection: null,
          attempts: 0,
          aborted: false,
        },
      })
    );
    await expect(client.search('query', 'T1234')).resolves.toEqual([]);
    expect(ensureIndex).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('propagates search errors', async () => {
    esClient.search.mockRejectedValueOnce(new Error('Search failed'));
    await expect(client.search('query', 'T1234')).rejects.toThrow('Search failed');
  });
});
