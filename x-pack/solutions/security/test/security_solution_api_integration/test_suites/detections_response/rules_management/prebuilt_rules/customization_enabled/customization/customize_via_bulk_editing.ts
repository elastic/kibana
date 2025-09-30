/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type {
  BulkActionEditPayload,
  BulkEditActionResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import {
  BulkActionTypeEnum,
  BulkActionEditTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerless Customize via bulk editing', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const QUERY_PREBUILT_RULE_ID = 'test-query-prebuilt-rule';
    const QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
      rule_id: QUERY_PREBUILT_RULE_ID,
      type: 'query',
      query: '*:*',
      language: 'kuery',
      name: 'Query prebuilt rule',
      index: ['existing-index-pattern-1', 'existing-index-pattern-2'],
      tags: ['existing-tag-1', 'existing-tag-2'],
      timeline_id: 'some-timeline-id',
      timeline_title: 'some-timeline-title',
      interval: '5m',
      from: 'now-10m',
      to: 'now',
      version: 2,
    });
    const SAVED_QUERY_PREBUILT_RULE_ID = 'test-saved-query-prebuilt-rule';
    const SAVED_QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
      rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
      type: 'saved_query',
      saved_id: 'test-saved-query',
      name: 'Saved query prebuilt rule',
      index: ['existing-index-pattern-1', 'existing-index-pattern-2'],
      tags: ['existing-tag-1', 'existing-tag-2'],
      timeline_id: 'some-timeline-id',
      timeline_title: 'some-timeline-title',
      interval: '5m',
      from: 'now-10m',
      to: 'now',
      version: 3,
    });
    const EQL_PREBUILT_RULE_ID = 'test-eql-prebuilt-rule';
    const EQL_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
      rule_id: EQL_PREBUILT_RULE_ID,
      type: 'eql',
      name: 'EQL prebuilt rule',
      query: 'any where true',
      language: 'eql',
      index: ['existing-index-pattern-1', 'existing-index-pattern-2'],
      tags: ['existing-tag-1', 'existing-tag-2'],
      timeline_id: 'some-timeline-id',
      timeline_title: 'some-timeline-title',
      interval: '5m',
      from: 'now-10m',
      to: 'now',
      version: 4,
    });
    const PREBUILT_RULE_ASSETS = [
      QUERY_PREBUILT_RULE_ASSET,
      SAVED_QUERY_PREBUILT_RULE_ASSET,
      EQL_PREBUILT_RULE_ASSET,
    ];

    const performBulkEditOnPrebuiltRules = async (
      bulkEditPayload: BulkActionEditPayload
    ): Promise<BulkEditActionResponse> => {
      const {
        body: { data: prebuiltRules },
      } = await detectionsApi
        .findRules({
          query: {
            filter: 'alert.attributes.params.immutable: true',
            per_page: PREBUILT_RULE_ASSETS.length,
          },
        })
        .expect(200);

      const { body: bulkEditResponse } = await detectionsApi
        .performRulesBulkAction({
          query: {},
          body: {
            ids: prebuiltRules.map((rule: RuleResponse) => rule.id),
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [bulkEditPayload],
          },
        })
        .expect(200);

      expect(bulkEditResponse).toMatchObject({
        success: true,
        rules_count: PREBUILT_RULE_ASSETS.length,
      });
      expect(bulkEditResponse.attributes.summary).toMatchObject({
        succeeded: PREBUILT_RULE_ASSETS.length,
        total: PREBUILT_RULE_ASSETS.length,
      });

      return bulkEditResponse;
    };

    const testCustomizationViaBulkEditing = ({ hasBaseVersion }: { hasBaseVersion: boolean }) => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, PREBUILT_RULE_ASSETS);
        await installPrebuiltRules(es, supertest);

        if (!hasBaseVersion) {
          // Remove the prebuilt rule asset so that the base version is no longer available
          await deleteAllPrebuiltRuleAssets(es, log);
        }
      });

      it(`applies "${BulkActionEditTypeEnum.add_tags}" bulk edit action to prebuilt rules`, async () => {
        const bulkResponse = await performBulkEditOnPrebuiltRules({
          type: BulkActionEditTypeEnum.add_tags,
          value: ['new-tag'],
        });

        expect(bulkResponse.attributes.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: QUERY_PREBUILT_RULE_ID,
              tags: ['existing-tag-1', 'existing-tag-2', 'new-tag'],
            }),
            expect.objectContaining({
              rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
              tags: ['existing-tag-1', 'existing-tag-2', 'new-tag'],
            }),
            expect.objectContaining({
              rule_id: EQL_PREBUILT_RULE_ID,
              tags: ['existing-tag-1', 'existing-tag-2', 'new-tag'],
            }),
          ])
        );
      });

      it(`applies "${BulkActionEditTypeEnum.set_tags}" bulk edit action to prebuilt rules`, async () => {
        const bulkResponse = await performBulkEditOnPrebuiltRules({
          type: BulkActionEditTypeEnum.set_tags,
          value: ['new-tag'],
        });

        expect(bulkResponse.attributes.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: QUERY_PREBUILT_RULE_ID,
              tags: ['new-tag'],
            }),
            expect.objectContaining({
              rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
              tags: ['new-tag'],
            }),
            expect.objectContaining({
              rule_id: EQL_PREBUILT_RULE_ID,
              tags: ['new-tag'],
            }),
          ])
        );
      });

      it(`applies "${BulkActionEditTypeEnum.delete_tags}" bulk edit action to prebuilt rules`, async () => {
        const bulkResponse = await performBulkEditOnPrebuiltRules({
          type: BulkActionEditTypeEnum.delete_tags,
          value: ['existing-tag-1'],
        });

        expect(bulkResponse.attributes.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: QUERY_PREBUILT_RULE_ID,
              tags: ['existing-tag-2'],
            }),
            expect.objectContaining({
              rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
              tags: ['existing-tag-2'],
            }),
            expect.objectContaining({
              rule_id: EQL_PREBUILT_RULE_ID,
              tags: ['existing-tag-2'],
            }),
          ])
        );
      });

      it(`applies "${BulkActionEditTypeEnum.delete_index_patterns}" bulk edit action to prebuilt rules`, async () => {
        const bulkResponse = await performBulkEditOnPrebuiltRules({
          type: BulkActionEditTypeEnum.delete_index_patterns,
          value: ['existing-index-pattern-1'],
        });

        expect(bulkResponse.attributes.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: QUERY_PREBUILT_RULE_ID,
              index: ['existing-index-pattern-2'],
            }),
            expect.objectContaining({
              rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
              index: ['existing-index-pattern-2'],
            }),
            expect.objectContaining({
              rule_id: EQL_PREBUILT_RULE_ID,
              index: ['existing-index-pattern-2'],
            }),
          ])
        );
      });

      it(`applies "${BulkActionEditTypeEnum.add_index_patterns}" bulk edit action to prebuilt rules`, async () => {
        const bulkResponse = await performBulkEditOnPrebuiltRules({
          type: BulkActionEditTypeEnum.add_index_patterns,
          value: ['test-*'],
        });

        expect(bulkResponse.attributes.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: QUERY_PREBUILT_RULE_ID,
              index: ['existing-index-pattern-1', 'existing-index-pattern-2', 'test-*'],
            }),
            expect.objectContaining({
              rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
              index: ['existing-index-pattern-1', 'existing-index-pattern-2', 'test-*'],
            }),
            expect.objectContaining({
              rule_id: EQL_PREBUILT_RULE_ID,
              index: ['existing-index-pattern-1', 'existing-index-pattern-2', 'test-*'],
            }),
          ])
        );
      });

      it(`applies "${BulkActionEditTypeEnum.set_index_patterns}" bulk edit action to prebuilt rules`, async () => {
        const bulkResponse = await performBulkEditOnPrebuiltRules({
          type: BulkActionEditTypeEnum.set_index_patterns,
          value: ['test-*'],
        });

        expect(bulkResponse.attributes.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: QUERY_PREBUILT_RULE_ID,
              index: ['test-*'],
            }),
            expect.objectContaining({
              rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
              index: ['test-*'],
            }),
            expect.objectContaining({
              rule_id: EQL_PREBUILT_RULE_ID,
              index: ['test-*'],
            }),
          ])
        );
      });

      it(`applies "${BulkActionEditTypeEnum.set_timeline}" bulk edit action to prebuilt rules`, async () => {
        const bulkResponse = await performBulkEditOnPrebuiltRules({
          type: BulkActionEditTypeEnum.set_timeline,
          value: { timeline_id: 'mock-id', timeline_title: 'mock-title' },
        });

        expect(bulkResponse.attributes.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: QUERY_PREBUILT_RULE_ID,
              timeline_id: 'mock-id',
              timeline_title: 'mock-title',
            }),
            expect.objectContaining({
              rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
              timeline_id: 'mock-id',
              timeline_title: 'mock-title',
            }),
            expect.objectContaining({
              rule_id: EQL_PREBUILT_RULE_ID,
              timeline_id: 'mock-id',
              timeline_title: 'mock-title',
            }),
          ])
        );
      });

      it(`applies "${BulkActionEditTypeEnum.set_schedule}" bulk edit action to prebuilt rules`, async () => {
        const bulkResponse = await performBulkEditOnPrebuiltRules({
          type: BulkActionEditTypeEnum.set_schedule,
          value: { interval: '1m', lookback: '1m' },
        });

        expect(bulkResponse.attributes.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: QUERY_PREBUILT_RULE_ID,
              interval: '1m',
              from: 'now-120s',
              to: 'now',
            }),
            expect.objectContaining({
              rule_id: SAVED_QUERY_PREBUILT_RULE_ID,
              interval: '1m',
              from: 'now-120s',
              to: 'now',
            }),
            expect.objectContaining({
              rule_id: EQL_PREBUILT_RULE_ID,
              interval: '1m',
              from: 'now-120s',
              to: 'now',
            }),
          ])
        );
      });
    };

    describe('when base version is available', () => {
      testCustomizationViaBulkEditing({ hasBaseVersion: false });
    });

    describe('when base version is missing', () => {
      testCustomizationViaBulkEditing({ hasBaseVersion: false });
    });
  });
};
