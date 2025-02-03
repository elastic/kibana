/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import {
  ModeEnum,
  PERFORM_RULE_UPGRADE_URL,
  PickVersionValuesEnum,
  QueryRuleCreateFields,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import expect from 'expect';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObjectOfType,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../utils';

const createBaseRuleVersion = async (es: Client) => {
  const ruleAsset = createRuleAssetSavedObjectOfType<QueryRuleCreateFields>('query');
  await createHistoricalPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);

  return ruleAsset;
};

const createTargetRuleVersion = async (es: Client) => {
  const ruleAsset = createRuleAssetSavedObjectOfType<QueryRuleCreateFields>('query');
  ruleAsset['security-rule'].version += 1;
  ruleAsset['security-rule'].name = 'New rule name';
  await createHistoricalPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);

  return ruleAsset;
};

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Perform Prebuilt Rule Upgrades - Customization Disabled', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    // All pick version values but 'TARGET' should be blocked
    [
      PickVersionValuesEnum.BASE,
      PickVersionValuesEnum.CURRENT,
      PickVersionValuesEnum.MERGED,
    ].forEach((pickVersion) => {
      it(`blocks upgrade to the ${pickVersion} version`, async () => {
        // Install base prebuilt detection rule
        await createBaseRuleVersion(es);
        await installPrebuiltRules(es, supertest);

        // Create a new target version of the rule
        await createTargetRuleVersion(es);

        const { body } = await supertest
          .post(PERFORM_RULE_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .set('x-elastic-internal-origin', 'foo')
          .send({
            mode: ModeEnum.ALL_RULES,
            pick_version: pickVersion,
          })
          .expect(400);

        expect(body.message).toEqual(
          `Only the 'TARGET' version can be selected for a rule update; received: '${pickVersion}'`
        );
      });
    });

    it('blocks upgrading rule fields to resolved values', async () => {
      // Install base prebuilt detection rule
      const baseVersion = await createBaseRuleVersion(es);
      await installPrebuiltRules(es, supertest);

      // Create a new target version of the rule
      const targetVersion = await createTargetRuleVersion(es);

      const { body } = await supertest
        .post(PERFORM_RULE_UPGRADE_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .set('x-elastic-internal-origin', 'foo')
        .send({
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: baseVersion['security-rule'].rule_id,
              version: targetVersion['security-rule'].version,
              revision: 0,
              fields: {
                name: {
                  pick_version: 'RESOLVED',
                  resolved_value: 'foo',
                },
              },
            },
          ],
        })
        .expect(400);

      expect(body.message).toEqual(
        'Rule field customization is not allowed. Received fields: name'
      );
    });

    it('allows upgrading all rules to the TARGET version', async () => {
      // Install base prebuilt detection rule
      await createBaseRuleVersion(es);
      await installPrebuiltRules(es, supertest);

      // Create a new target version of the rule
      await createTargetRuleVersion(es);

      const { body } = await supertest
        .post(PERFORM_RULE_UPGRADE_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .set('x-elastic-internal-origin', 'foo')
        .send({
          mode: ModeEnum.ALL_RULES,
          pick_version: PickVersionValuesEnum.TARGET,
        })
        .expect(200);

      expect(body.errors.length).toEqual(0);
      expect(body.summary.succeeded).toEqual(1);
    });

    it('allows upgrading specific rules to the TARGET version', async () => {
      // Install base prebuilt detection rule
      const baseVersion = await createBaseRuleVersion(es);
      await installPrebuiltRules(es, supertest);

      // Create a new target version of the rule
      const targetVersion = await createTargetRuleVersion(es);

      const { body } = await supertest
        .post(PERFORM_RULE_UPGRADE_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .set('x-elastic-internal-origin', 'foo')
        .send({
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: baseVersion['security-rule'].rule_id,
              version: targetVersion['security-rule'].version,
              pick_version: PickVersionValuesEnum.TARGET,
              revision: 0,
            },
          ],
        })
        .expect(200);

      expect(body.errors.length).toEqual(0);
      expect(body.summary.succeeded).toEqual(1);
    });
  });
};
