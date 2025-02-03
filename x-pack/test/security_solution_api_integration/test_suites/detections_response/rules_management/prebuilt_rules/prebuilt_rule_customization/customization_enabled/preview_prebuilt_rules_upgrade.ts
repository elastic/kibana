/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets, reviewPrebuiltRulesToUpgrade } from '../../../../utils';
import { setUpRuleUpgrade } from '../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const deps = {
    es,
    supertest,
    log,
  };

  describe('@ess @serverless @skipInServerlessMKI preview prebuilt rules upgrade', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('stats', () => {
      it('returns num of rules with upgrades', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                version: 1,
              },
              patch: {},
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                version: 2,
              },
            },
            {
              installed: {
                rule_id: 'saved-query-rule',
                type: 'query',
                version: 1,
              },
              patch: {},
              upgrade: {
                rule_id: 'saved-query-rule',
                type: 'query',
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_to_upgrade_total: 2,
        });
      });

      it('returns zero conflicts when there are no conflicts', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                version: 1,
              },
              patch: {},
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                version: 2,
              },
            },
            {
              installed: {
                rule_id: 'saved-query-rule',
                type: 'query',
                version: 1,
              },
              patch: {},
              upgrade: {
                rule_id: 'saved-query-rule',
                type: 'query',
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_with_conflicts: 0,
          num_rules_with_non_solvable_conflicts: 0,
        });
      });

      it('returns num of rules with conflicts', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Initial name',
                version: 1,
              },
              patch: {
                rule_id: 'query-rule',
                name: 'Customized name',
              },
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Updated name',
                version: 2,
              },
            },
            {
              installed: {
                rule_id: 'saved-query-rule',
                type: 'query',
                tags: ['tagA'],
                version: 1,
              },
              patch: {
                rule_id: 'saved-query-rule',
                tags: ['tagB'],
              },
              upgrade: {
                rule_id: 'saved-query-rule',
                type: 'query',
                tags: ['tagC'],
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_with_conflicts: 2,
        });
      });

      it('returns num of rules with non-solvable conflicts', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Initial name',
                version: 1,
              },
              patch: {
                rule_id: 'query-rule',
                name: 'Customized name',
              },
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Updated name',
                version: 2,
              },
            },
            {
              installed: {
                rule_id: 'saved-query-rule',
                type: 'query',
                tags: ['tagA'],
                version: 1,
              },
              patch: {
                rule_id: 'saved-query-rule',
                tags: ['tagB'],
              },
              upgrade: {
                rule_id: 'saved-query-rule',
                type: 'query',
                tags: ['tagC'],
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_with_non_solvable_conflicts: 1,
        });
      });

      it('returns num of rules with conflicts when historical versions are missing', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Initial name',
                version: 1,
              },
              patch: {},
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                version: 2,
              },
            },
            {
              installed: {
                rule_id: 'saved-query-rule',
                type: 'query',
                version: 1,
              },
              patch: {},
              upgrade: {
                rule_id: 'saved-query-rule',
                type: 'query',
                name: 'Updated name',
                version: 2,
              },
            },
          ],
          removeInstalledAssets: true,
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_with_conflicts: 2,
        });
      });
    });

    describe('fields diff stats', () => {
      it('returns num of fields with updates', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Initial name',
                tags: ['tabA'],
                version: 1,
              },
              patch: {
                rule_id: 'query-rule',
                name: 'Customized name',
              },
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Updated name',
                tags: ['tabC'],
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_updates: 3, // name + tags + version = 3 fields
        });
      });

      it('returns num of fields with conflicts', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Initial name',
                tags: ['tabA'],
                version: 1,
              },
              patch: {
                rule_id: 'query-rule',
                name: 'Customized name',
                tags: ['tabB'],
              },
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Updated name',
                tags: ['tabC'],
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_conflicts: 2,
        });
      });

      it('returns num of fields with non-solvable conflicts', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Initial name',
                tags: ['tabA'],
                version: 1,
              },
              patch: {
                rule_id: 'query-rule',
                name: 'Customized name',
                tags: ['tabB'],
              },
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Updated name',
                tags: ['tabC'],
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_non_solvable_conflicts: 1,
        });
      });
    });

    describe('fields diff', () => {
      it('returns fields diff', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Initial name',
                tags: ['tabA'],
                version: 1,
              },
              patch: {
                rule_id: 'query-rule',
                name: 'Customized name',
              },
              upgrade: {
                rule_id: 'query-rule',
                type: 'query',
                name: 'Updated name',
                tags: ['tabC'],
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.rules[0].diff.fields).toMatchObject({
          name: expect.any(Object),
          tags: expect.any(Object),
        });
      });
    });
  });
};
