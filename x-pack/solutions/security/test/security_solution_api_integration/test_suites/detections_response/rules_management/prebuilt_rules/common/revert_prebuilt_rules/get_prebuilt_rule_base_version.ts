/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  GET_PREBUILT_RULES_BASE_VERSION_URL,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
  getCustomQueryRuleParams,
} from '../../../../utils';
import { getPrebuiltRuleBaseVersion } from '../../../../utils/rules/prebuilt_rules/get_prebuilt_rule_base_version';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  const ruleAsset = createRuleAssetSavedObject({
    rule_id: 'rule_1',
  });

  describe('@ess @serverless @skipInServerlessMKI Get prebuilt rule base version', () => {
    after(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('fetching prebuilt rule base versions', () => {
      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllPrebuiltRuleAssets(es, log);
        await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
        await installPrebuiltRules(es, supertest);
      });

      it('returns rule versions and diff field if rule is customized', async () => {
        const {
          body: {
            data: [baseVersion],
          },
        } = await detectionsApi.findRules({
          query: {
            filter: 'alert.attributes.params.immutable: true',
            per_page: 1,
          },
        });

        const { body: modifiedCurrentVersion } = await detectionsApi.patchRule({
          body: { rule_id: 'rule_1', description: 'new description' },
        });

        const response = await getPrebuiltRuleBaseVersion(supertest, { id: baseVersion.id });

        expect(response.base_version).toEqual(baseVersion);
        expect(response.current_version).toEqual({
          ...baseVersion,
          description: 'new description',
          revision: 1, // Rule has been modified once
          rule_source: {
            is_customized: true,
            type: 'external',
          },
          updated_at: modifiedCurrentVersion.updated_at,
        });
        expect(response.diff).toMatchObject({
          num_fields_with_updates: 0,
          num_fields_with_conflicts: 0,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(response.diff.fields).toEqual({
          description: {
            conflict: ThreeWayDiffConflict.NONE,
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            base_version: 'some description',
            current_version: 'new description',
            merged_version: 'new description',
            target_version: 'some description',
            has_update: false,
            has_base_version: true,
          },
        });
      });

      it('returns rule versions and empty diff field if rule is not customized', async () => {
        const {
          body: {
            data: [baseVersion],
          },
        } = await detectionsApi.findRules({
          query: {
            filter: 'alert.attributes.params.immutable: true',
            per_page: 1,
          },
        });

        const response = await getPrebuiltRuleBaseVersion(supertest, { id: baseVersion.id });

        expect(response.base_version).toEqual(baseVersion);
        expect(response.current_version).toEqual(baseVersion);
        expect(response.diff).toMatchObject({
          num_fields_with_updates: 0,
          num_fields_with_conflicts: 0,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(response.diff.fields).toEqual({});
      });

      describe('error states', () => {
        it('returns a 404 error if rule base version cannot be found', async () => {
          await deleteAllPrebuiltRuleAssets(es, log); // Delete rule base versions

          const {
            body: {
              data: [prebuiltRule],
            },
          } = await detectionsApi.findRules({
            query: {
              filter: 'alert.attributes.params.immutable: true',
              per_page: 1,
            },
          });

          const { body } = await supertest
            .get(GET_PREBUILT_RULES_BASE_VERSION_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '1')
            .set('x-elastic-internal-origin', 'securitySolution')
            .query({ id: prebuiltRule.id })
            .expect(404);

          expect(body).toEqual({
            status_code: 404,
            message: 'Cannot find rule base_version',
          });
        });

        it('returns a 404 error if rule is custom', async () => {
          const { body: customRule } = await detectionsApi.createRule({
            body: getCustomQueryRuleParams({ rule_id: 'rule-1' }),
          });

          const { body } = await supertest
            .get(GET_PREBUILT_RULES_BASE_VERSION_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '1')
            .set('x-elastic-internal-origin', 'securitySolution')
            .query({ id: customRule.id })
            .expect(404);

          expect(body).toEqual({
            status_code: 404,
            message: 'Cannot find rule base_version',
          });
        });
      });
    });
  });
};
