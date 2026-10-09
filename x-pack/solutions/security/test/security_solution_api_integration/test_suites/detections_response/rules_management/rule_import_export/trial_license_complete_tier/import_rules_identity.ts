/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  binaryToString,
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  getCustomQueryRuleParams,
  importRules,
  importRulesWithSuccess,
  installPrebuiltRules,
  parseNdJson,
} from '../../../utils';

/**
 * Locks today's `_import` identity contract: matching is by `rule_id`, payload
 * `id` is ignored on create, and overwrite keeps the existing SO id.
 * See https://github.com/elastic/kibana/issues/279741
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const es = getService('es');
  const spacesServices = getService('spaces');

  const spaceId = 'identity-test-space';

  describe('@ess @serverless @skipInServerlessMKI import rules identity (id vs rule_id)', () => {
    before(async () => {
      await spacesServices.delete(spaceId);
      await spacesServices.create({
        id: spaceId,
        name: spaceId,
      });
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllRules(supertest, log, spaceId);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('ignores payload id on create and assigns a new saved object id', async () => {
      const payloadId = uuidv4();
      const ruleId = 'identity-create-rule';

      await importRulesWithSuccess({
        getService,
        rules: [
          {
            ...getCustomQueryRuleParams({
              rule_id: ruleId,
              name: 'Identity create',
              enabled: false,
            }),
            id: payloadId,
          },
        ],
        overwrite: false,
      });

      await detectionsApi.readRule({ query: { id: payloadId } }).expect(404);

      const { body } = await detectionsApi
        .readRule({
          query: { rule_id: ruleId },
        })
        .expect(200);

      expect(body.rule_id).toBe(ruleId);
      expect(body.id).not.toBe(payloadId);
    });

    it('keeps the existing saved object id when overwriting by matching rule_id', async () => {
      const ruleId = 'identity-overwrite-rule';
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: ruleId,
          name: 'Existing identity rule',
          enabled: false,
        })
      );

      const payloadId = uuidv4();

      await importRulesWithSuccess({
        getService,
        rules: [
          {
            ...getCustomQueryRuleParams({
              rule_id: ruleId,
              name: 'Overwritten identity rule',
              enabled: false,
            }),
            id: payloadId,
          },
        ],
        overwrite: true,
      });

      const { body } = await detectionsApi
        .readRule({
          query: { rule_id: ruleId },
        })
        .expect(200);

      expect(body.id).toBe(existing.id);
      expect(body.id).not.toBe(payloadId);
      expect(body.name).toBe('Overwritten identity rule');
    });

    it('does not match on payload id when rule_id differs, leaving two rules', async () => {
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'identity-existing-rule-id',
          name: 'Existing rule B',
          enabled: false,
        })
      );

      // Import claims the existing SO id but a different rule_id. Today matching
      // is only by rule_id, so this creates a second rule with a new SO id.
      const importResponse = await importRules({
        getService,
        rules: [
          {
            ...getCustomQueryRuleParams({
              rule_id: 'identity-imported-rule-id',
              name: 'Imported rule C',
              enabled: false,
            }),
            id: existing.id,
          },
        ],
        overwrite: true,
      });

      expect(importResponse).toMatchObject({
        success: true,
        success_count: 1,
        rules_count: 1,
        errors: [],
      });

      const { body: original } = await detectionsApi
        .readRule({
          query: { id: existing.id },
        })
        .expect(200);

      expect(original.rule_id).toBe('identity-existing-rule-id');
      expect(original.name).toBe('Existing rule B');

      const { body: created } = await detectionsApi
        .readRule({
          query: { rule_id: 'identity-imported-rule-id' },
        })
        .expect(200);

      expect(created.id).not.toBe(existing.id);
      expect(created.name).toBe('Imported rule C');

      const { body: all } = await detectionsApi
        .findRules({
          query: { page: 1, per_page: 10 },
        })
        .expect(200);

      expect(all.total).toBe(2);
    });

    it('creates two rules when one NDJSON reuses the same payload id with different rule_ids', async () => {
      const sharedId = uuidv4();

      await importRulesWithSuccess({
        getService,
        rules: [
          {
            ...getCustomQueryRuleParams({
              rule_id: 'identity-shared-id-1',
              name: 'Shared id first',
              enabled: false,
            }),
            id: sharedId,
          },
          {
            ...getCustomQueryRuleParams({
              rule_id: 'identity-shared-id-2',
              name: 'Shared id second',
              enabled: false,
            }),
            id: sharedId,
          },
        ],
        overwrite: false,
      });

      const { body: first } = await detectionsApi
        .readRule({ query: { rule_id: 'identity-shared-id-1' } })
        .expect(200);
      const { body: second } = await detectionsApi
        .readRule({ query: { rule_id: 'identity-shared-id-2' } })
        .expect(200);

      expect(first.id).not.toBe(sharedId);
      expect(second.id).not.toBe(sharedId);
      expect(first.id).not.toBe(second.id);

      const { body: all } = await detectionsApi
        .findRules({ query: { page: 1, per_page: 10 } })
        .expect(200);
      expect(all.total).toBe(2);
    });

    it('does not reassign saved object ownership when overwrite matches a different rule_id', async () => {
      const ruleA = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'identity-swap-a',
          name: 'Rule A',
          enabled: false,
        })
      );
      const ruleB = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'identity-swap-b',
          name: 'Rule B',
          enabled: false,
        })
      );

      // Claims A's SO id but matches B by rule_id → updates B, leaves A alone.
      await importRulesWithSuccess({
        getService,
        rules: [
          {
            ...getCustomQueryRuleParams({
              rule_id: 'identity-swap-b',
              name: 'Rule B overwritten',
              enabled: false,
            }),
            id: ruleA.id,
          },
        ],
        overwrite: true,
      });

      const { body: stillA } = await detectionsApi
        .readRule({ query: { id: ruleA.id } })
        .expect(200);
      expect(stillA.rule_id).toBe('identity-swap-a');
      expect(stillA.name).toBe('Rule A');

      const { body: updatedB } = await detectionsApi
        .readRule({ query: { id: ruleB.id } })
        .expect(200);
      expect(updatedB.rule_id).toBe('identity-swap-b');
      expect(updatedB.name).toBe('Rule B overwritten');
      expect(updatedB.id).not.toBe(ruleA.id);
    });

    it('conflicts on rule_id even when the payload id differs from the existing saved object id', async () => {
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'identity-conflict-rule',
          name: 'Existing conflict rule',
          enabled: false,
        })
      );

      const importResponse = await importRules({
        getService,
        rules: [
          {
            ...getCustomQueryRuleParams({
              rule_id: 'identity-conflict-rule',
              name: 'Should not import',
              enabled: false,
            }),
            id: uuidv4(),
          },
        ],
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        success: false,
        success_count: 0,
        rules_count: 1,
        errors: [
          {
            rule_id: 'identity-conflict-rule',
            error: {
              message: 'Rule with this rule_id already exists',
              status_code: 409,
            },
          },
        ],
      });

      const { body } = await detectionsApi.readRule({ query: { id: existing.id } }).expect(200);
      expect(body.name).toBe('Existing conflict rule');
    });

    it('export then overwrite re-import keeps the saved object id; after delete, create ignores the exported id', async () => {
      const ruleId = 'identity-roundtrip-rule';
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: ruleId,
          name: 'Roundtrip original',
          enabled: false,
        })
      );

      const { body: exportBody } = await detectionsApi
        .exportRules({ query: {}, body: null })
        .expect(200)
        .parse(binaryToString);

      const exportedRules = parseNdJson(exportBody).filter(
        (line): line is Record<string, unknown> =>
          typeof line === 'object' && line !== null && 'rule_id' in line
      );
      expect(exportedRules).toHaveLength(1);
      expect(exportedRules[0].id).toBe(existing.id);

      await importRulesWithSuccess({
        getService,
        rules: [{ ...exportedRules[0], name: 'Roundtrip overwritten' }],
        overwrite: true,
      });

      const { body: afterOverwrite } = await detectionsApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);
      expect(afterOverwrite.id).toBe(existing.id);
      expect(afterOverwrite.name).toBe('Roundtrip overwritten');

      await deleteAllRules(supertest, log);

      await importRulesWithSuccess({
        getService,
        rules: exportedRules,
        overwrite: false,
      });

      const { body: afterCreate } = await detectionsApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);
      expect(afterCreate.id).not.toBe(existing.id);
      await detectionsApi.readRule({ query: { id: existing.id } }).expect(404);
    });

    it('overwrites a prebuilt rule by rule_id and keeps its saved object id despite payload id', async () => {
      const ruleId = 'identity-prebuilt-rule';
      await createPrebuiltRuleAssetSavedObjects(es, [
        createRuleAssetSavedObject({
          rule_id: ruleId,
          version: 1,
          name: 'Prebuilt identity original',
        }),
      ]);
      await installPrebuiltRules(es, supertest);

      const { body: installed } = await detectionsApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);

      const payloadId = uuidv4();
      await importRulesWithSuccess({
        getService,
        rules: [
          {
            ...getCustomQueryRuleParams({
              rule_id: ruleId,
              name: 'Prebuilt identity overwritten',
              enabled: false,
              version: 1,
            }),
            id: payloadId,
          },
        ],
        overwrite: true,
      });

      const { body } = await detectionsApi.readRule({ query: { rule_id: ruleId } }).expect(200);

      expect(body.id).toBe(installed.id);
      expect(body.id).not.toBe(payloadId);
      expect(body.name).toBe('Prebuilt identity overwritten');
      // Overwrite by rule_id must keep the prebuilt classification family.
      expect(body.immutable).toBe(true);
      expect(body.rule_source).toMatchObject({
        type: 'external',
        is_customized: true,
      });
    });

    it('ignores a default-space saved object id when creating in another space', async () => {
      const defaultRule = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'identity-default-space-rule',
          name: 'Default space rule',
          enabled: false,
        })
      );

      await importRulesWithSuccess({
        getService,
        rules: [
          {
            ...getCustomQueryRuleParams({
              rule_id: 'identity-other-space-rule',
              name: 'Other space rule',
              enabled: false,
            }),
            id: defaultRule.id,
          },
        ],
        overwrite: false,
        spaceId,
      });

      const { body: stillDefault } = await detectionsApi
        .readRule({ query: { id: defaultRule.id } })
        .expect(200);
      expect(stillDefault.rule_id).toBe('identity-default-space-rule');

      await detectionsApi.readRule({ query: { id: defaultRule.id } }, spaceId).expect(404);

      const { body: created } = await detectionsApi
        .readRule({ query: { rule_id: 'identity-other-space-rule' } }, spaceId)
        .expect(200);

      expect(created.id).not.toBe(defaultRule.id);
      expect(created.name).toBe('Other space rule');
    });
  });
};
