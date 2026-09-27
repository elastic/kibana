/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getInstalledPrebuiltRuleAssets } from './get_installed_prebuilt_rule_assets';
import { getMockPrebuiltRuleAssetSearchResponse } from '../detections/ml_jobs/get_metrics.mocks';

describe('getInstalledPrebuiltRuleAssets', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.getCurrentNamespace.mockReturnValue('default');
    savedObjectsClient.search.mockResolvedValue(getMockPrebuiltRuleAssetSearchResponse([]));
    logger = loggingSystemMock.createLogger();
  });

  it('returns an empty list without calling the saved objects client when there are no versions', async () => {
    const result = await getInstalledPrebuiltRuleAssets({
      versions: [],
      logger,
      savedObjectsClient,
    });

    expect(result).toEqual([]);
    expect(savedObjectsClient.search).not.toHaveBeenCalled();
  });

  it('queries by asset id, excludes deprecated assets and fetches identity fields only', async () => {
    await getInstalledPrebuiltRuleAssets({
      versions: [
        { rule_id: 'rule-1', version: 1 },
        { rule_id: 'rule-2', version: 3 },
      ],
      logger,
      savedObjectsClient,
    });

    expect(savedObjectsClient.search).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.search).toHaveBeenCalledWith({
      type: 'security-rule',
      namespaces: ['default'],
      size: 2,
      _source: { includes: ['security-rule.rule_id', 'security-rule.version'] },
      query: {
        bool: {
          must: { terms: { _id: ['security-rule:rule-1_1', 'security-rule:rule-2_3'] } },
          must_not: { term: { 'security-rule.deprecated': true } },
        },
      },
    });
  });

  it('returns the versions found in the asset store', async () => {
    savedObjectsClient.search.mockResolvedValue(
      getMockPrebuiltRuleAssetSearchResponse([{ rule_id: 'rule-2', version: 3 }])
    );

    const result = await getInstalledPrebuiltRuleAssets({
      versions: [
        { rule_id: 'rule-1', version: 1 },
        { rule_id: 'rule-2', version: 3 },
      ],
      logger,
      savedObjectsClient,
    });

    expect(result).toEqual([{ rule_id: 'rule-2', version: 3 }]);
  });
});
