/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { MAX_DEPRECATED_RULES_TO_RETURN } from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { getDeprecatedPrebuiltRuleMock } from '../../../../model/rule_assets/deprecated_prebuilt_rule_asset.mock';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { fetchDeprecatedRules } from './fetch_deprecated_rules';

describe('fetchDeprecatedRules', () => {
  it('passes MAX_DEPRECATED_RULES_TO_RETURN as perPage so the limit is enforced at the query level', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 0, page: 1 });

    await fetchDeprecatedRules(soClient);

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ perPage: MAX_DEPRECATED_RULES_TO_RETURN })
    );
  });

  it('returns validated deprecated rule assets from the saved objects result', async () => {
    const soClient = savedObjectsClientMock.create();
    const mockAsset = getDeprecatedPrebuiltRuleMock({ rule_id: 'rule-1', version: 2 });

    soClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'so-id-1',
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          references: [],
          attributes: mockAsset,
          score: 0,
        },
      ],
      total: 1,
      per_page: MAX_DEPRECATED_RULES_TO_RETURN,
      page: 1,
    });

    const result = await fetchDeprecatedRules(soClient);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ rule_id: 'rule-1', version: 2, deprecated: true });
  });

  it('scopes the query to the provided rule_ids when given', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 0, page: 1 });

    await fetchDeprecatedRules(soClient, ['rule-a', 'rule-b']);

    const callArgs = soClient.find.mock.calls[0][0];
    expect(callArgs.filter).toContain('rule-a');
    expect(callArgs.filter).toContain('rule-b');
  });

  it('returns empty array immediately when given an empty rule_ids list', async () => {
    const soClient = savedObjectsClientMock.create();

    const result = await fetchDeprecatedRules(soClient, []);

    expect(result).toEqual([]);
    expect(soClient.find).not.toHaveBeenCalled();
  });
});
