/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, KbnClient } from '@kbn/scout-security';
import { ELASTIC_INTERNAL_ORIGIN_HEADER } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../../../common/constants';
import {
  PERFORM_RULE_INSTALLATION_URL,
  REVIEW_RULE_UPGRADE_URL,
} from '../../../../../../common/api/detection_engine/prebuilt_rules/urls';
import type { ReviewRuleUpgradeResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_upgrade/review_rule_upgrade_route.gen';
import type { PrebuiltRuleAsset } from '../../../../../../server/lib/detection_engine/prebuilt_rules';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../../../../../server/lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_type';
import { getPrebuiltRuleMock } from '../../../../../../server/lib/detection_engine/prebuilt_rules/mocks';
import { apiTest, tags } from '../../fixtures';
import { PUBLIC_HEADERS } from '../../fixtures/constants';

/**
 * The upgrade review endpoint reports facet counts for the rules that have an update available.
 * The `isCustomized` facet is derived from a boolean field, so its buckets must be keyed by the
 * literal strings `"true"` / `"false"` rather than by Elasticsearch's numeric `1` / `0` keys.
 */

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'true',
  'elastic-api-version': '1',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
};

const INSTALLED_VERSION = 1;
const TARGET_VERSION = 2;

const RULE_ASSETS = [
  { ruleId: 'rule-a', name: 'Rule A' },
  { ruleId: 'rule-b', name: 'Rule B' },
  { ruleId: 'rule-c', name: 'Rule C' },
];

const CUSTOMIZED_RULE = RULE_ASSETS[0];

apiTest.describe(
  'Prebuilt rules upgrade review facet counts',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let internalHeaders: Record<string, string>;
    let publicHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, kbnClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      internalHeaders = { ...cookieHeader, ...INTERNAL_HEADERS };
      publicHeaders = { ...cookieHeader, ...PUBLIC_HEADERS };

      await deleteAllRules(apiClient, publicHeaders);
      await deleteAllPrebuiltRuleAssets(kbnClient);

      await createPrebuiltRuleAssets(
        kbnClient,
        RULE_ASSETS.map(({ ruleId, name }) =>
          getPrebuiltRuleMock({ rule_id: ruleId, name, version: INSTALLED_VERSION })
        )
      );

      const installResponse = await apiClient.post(PERFORM_RULE_INSTALLATION_URL, {
        headers: internalHeaders,
        responseType: 'json',
        body: { mode: 'ALL_RULES' },
      });

      expect(installResponse.statusCode, JSON.stringify(installResponse.body)).toBe(200);
      expect(installResponse.body).toMatchObject({ summary: { succeeded: RULE_ASSETS.length } });

      const patchResponse = await apiClient.patch(DETECTION_ENGINE_RULES_URL, {
        headers: publicHeaders,
        responseType: 'json',
        body: { rule_id: CUSTOMIZED_RULE.ruleId, name: `${CUSTOMIZED_RULE.name} customized` },
      });

      expect(patchResponse.statusCode, JSON.stringify(patchResponse.body)).toBe(200);

      // The upgrade targets are published only after installation so that every installed rule has
      // exactly one newer version available.
      await createPrebuiltRuleAssets(
        kbnClient,
        RULE_ASSETS.map(({ ruleId, name }) =>
          getPrebuiltRuleMock({ rule_id: ruleId, name: `${name} v2`, version: TARGET_VERSION })
        )
      );
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      await deleteAllRules(apiClient, publicHeaders);
      await deleteAllPrebuiltRuleAssets(kbnClient);
    });

    apiTest(
      'returns isCustomized facet counts keyed by "true" / "false"',
      async ({ apiClient }) => {
        const response = await apiClient.post(REVIEW_RULE_UPGRADE_URL, {
          headers: internalHeaders,
          responseType: 'json',
          body: { aggregations: { counts: ['isCustomized'] } },
        });

        expect(response.statusCode, JSON.stringify(response.body)).toBe(200);

        const { total, counts } = response.body as ReviewRuleUpgradeResponseBody;

        expect(total).toBe(RULE_ASSETS.length);
        expect(counts?.isCustomized).toStrictEqual({ true: 1, false: RULE_ASSETS.length - 1 });
      }
    );
  }
);

/**
 * Creates `security-rule` saved objects the same way a prebuilt rules package would, keeping every
 * historical version so the installed rule and its upgrade target coexist.
 */
async function createPrebuiltRuleAssets(
  kbnClient: KbnClient,
  assets: PrebuiltRuleAsset[]
): Promise<void> {
  for (const asset of assets) {
    await kbnClient.savedObjects.create({
      type: PREBUILT_RULE_ASSETS_SO_TYPE,
      id: `${asset.rule_id}_${asset.version}`,
      attributes: asset,
      overwrite: true,
    });
  }
}

async function deleteAllPrebuiltRuleAssets(kbnClient: KbnClient): Promise<void> {
  await kbnClient.savedObjects.clean({ types: [PREBUILT_RULE_ASSETS_SO_TYPE] });
}

async function deleteAllRules(
  apiClient: ApiClientFixture,
  headers: Record<string, string>
): Promise<void> {
  const response = await apiClient.post(DETECTION_ENGINE_RULES_BULK_ACTION, {
    headers,
    responseType: 'json',
    body: { action: 'delete', query: '' },
  });

  expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
}
