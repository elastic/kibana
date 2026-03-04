/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObjectOfType,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
  installPrebuiltRulesAndTimelines,
} from '../../../../utils';
import { createMlRuleThroughAlertingEndpoint } from '../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Prebuilt rules installation perform', function () {
    this.tags('skipFIPS');

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('ML rules are skipped during installation if mode is ALL_RULES', async () => {
      const mlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning');
      const nonMlRuleAsset = createRuleAssetSavedObjectOfType('query');
      await createPrebuiltRuleAssetSavedObjects(es, [mlRuleAsset, nonMlRuleAsset]);

      const performInstallationResponse = await installPrebuiltRules(es, supertest);
      expect(performInstallationResponse).toMatchObject({
        summary: {
          total: 1,
          succeeded: 1,
          skipped: 0, // ML rules are skipped silently as if they were not present, so they don't count towards "skipped"
          failed: 0,
        },
        results: {
          created: [{ type: 'query' }],
        },
      });
    });

    it('ML rules produce an error during installation if mode is SPECIFIC_RULES', async () => {
      const mlRuleFields = { rule_id: 'ml-rule', version: 1 };
      const mlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning', mlRuleFields);

      const nonMlRuleFields = { rule_id: 'non-ml-rule', version: 1 };
      const nonMlRuleAsset = createRuleAssetSavedObjectOfType('query', nonMlRuleFields);

      await createPrebuiltRuleAssetSavedObjects(es, [mlRuleAsset, nonMlRuleAsset]);

      const performInstallationResponse = await installPrebuiltRules(es, supertest, [
        mlRuleFields,
        nonMlRuleFields,
      ]);

      expect(performInstallationResponse).toMatchObject({
        summary: { total: 2, succeeded: 1, skipped: 0, failed: 1 },
        results: {
          created: [{ rule_id: nonMlRuleFields.rule_id }],
        },
        errors: [
          {
            message: 'Your license does not support machine learning. Please upgrade your license.',
            status_code: 403,
            rules: [{ rule_id: mlRuleFields.rule_id }],
          },
        ],
      });
    });

    describe('legacy (PUT /api/detection_engine/rules/prepackaged)', () => {
      it('ML rules are silently excluded from installation', async () => {
        const mlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning');
        const nonMlRuleAsset = createRuleAssetSavedObjectOfType('query');
        await createPrebuiltRuleAssetSavedObjects(es, [mlRuleAsset, nonMlRuleAsset]);

        const response = await installPrebuiltRulesAndTimelines(es, supertest);

        expect(response.rules_installed).toBe(1);
        expect(response.rules_updated).toBe(0);
      });

      it('ML rules are silently excluded from updates', async () => {
        const queryRuleAsset = createRuleAssetSavedObjectOfType('query', {
          rule_id: 'query-rule',
          version: 1,
        });
        await createPrebuiltRuleAssetSavedObjects(es, [queryRuleAsset]);
        await installPrebuiltRulesAndTimelines(es, supertest);

        await createMlRuleThroughAlertingEndpoint(supertest, { ruleId: 'ml-rule', version: 1 });

        const targetQueryRuleAsset = createRuleAssetSavedObjectOfType('query', {
          rule_id: 'query-rule',
          version: 2,
        });
        const targetMlRuleAsset = createRuleAssetSavedObjectOfType('machine_learning', {
          rule_id: 'ml-rule',
          version: 2,
        });
        await createPrebuiltRuleAssetSavedObjects(es, [targetQueryRuleAsset, targetMlRuleAsset]);

        const response = await installPrebuiltRulesAndTimelines(es, supertest);

        expect(response.rules_installed).toBe(0);
        expect(response.rules_updated).toBe(1);
      });
    });
  });
};
