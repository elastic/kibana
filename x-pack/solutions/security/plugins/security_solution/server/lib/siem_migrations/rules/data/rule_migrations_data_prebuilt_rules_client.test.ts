/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, IScopedClusterClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { getPrebuiltRuleMock } from '../../../detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset.mock';
import type { PrebuildRuleVersionsMap } from './rule_migrations_data_prebuilt_rules_client';
import { RuleMigrationsDataPrebuiltRulesClient } from './rule_migrations_data_prebuilt_rules_client';

const versionsMap = (
  ...rules: Array<{ rule_id: string; version: number }>
): PrebuildRuleVersionsMap =>
  new Map(rules.map((rule) => [rule.rule_id, { target: getPrebuiltRuleMock(rule) }]));

describe('RuleMigrationsDataPrebuiltRulesClient', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const client = new RuleMigrationsDataPrebuiltRulesClient(
    jest.fn().mockResolvedValue('prebuilt-index'),
    { username: 'elastic' } as AuthenticatedUser,
    { asInternalUser: esClient } as unknown as IScopedClusterClient,
    loggerMock.create(),
    {} as SiemMigrationsClientDependencies
  );
  const bulkedDocs = (): Array<Record<string, unknown>> =>
    esClient.bulk.mock.calls.flatMap(([{ operations = [] }]) =>
      (operations as Array<{ doc?: Record<string, unknown> }>)
        .filter((operation) => operation.doc)
        .map((operation) => operation.doc as Record<string, unknown>)
    );

  const storedVersions = (versions: Record<string, string>) =>
    esClient.mget.mockResolvedValue({
      docs: Object.entries(versions).map(([id, version]) => ({
        _index: 'prebuilt-index',
        _id: id,
        found: true,
        _source: { version },
      })),
    } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.bulk.mockResolvedValue({ errors: false, items: [], took: 0 });
  });

  describe('populate', () => {
    it('should not index any rule when every rule version is unchanged', async () => {
      storedVersions({ 'rule-1': '3' });
      await client.populate(versionsMap({ rule_id: 'rule-1', version: 3 }));
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('should only index the rules whose version changed', async () => {
      storedVersions({ 'rule-1': '1', 'rule-2': '1' });
      await client.populate(
        versionsMap({ rule_id: 'rule-1', version: 1 }, { rule_id: 'rule-2', version: 2 })
      );
      expect(bulkedDocs().map((doc) => doc.rule_id)).toEqual(['rule-2']);
    });

    it('should index each rule with its asset version', async () => {
      esClient.mget.mockResolvedValue({ docs: [] } as never);
      await client.populate(versionsMap({ rule_id: 'rule-1', version: 7 }));
      expect(bulkedDocs()).toEqual([expect.objectContaining({ rule_id: 'rule-1', version: '7' })]);
    });
  });
});
