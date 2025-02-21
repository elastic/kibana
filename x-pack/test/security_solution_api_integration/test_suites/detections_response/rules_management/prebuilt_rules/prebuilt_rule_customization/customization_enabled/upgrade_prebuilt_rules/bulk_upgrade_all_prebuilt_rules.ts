/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ModeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { setUpRuleUpgrade } from '../../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { performUpgradePrebuiltRules } from '../../../../../utils';

export function bulkUpgradeAllPrebuiltRules({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const deps = {
    es,
    supertest,
    log,
  };

  describe('all rules', () => {
    describe('with historical versions', () => {
      const TEST_DATA = [
        { pickVersion: 'BASE', expectedTags: ['tagA'] },
        { pickVersion: 'CURRENT', expectedTags: ['tagB'] },
        { pickVersion: 'TARGET', expectedTags: ['tagC'] },
      ] as const;

      for (const { pickVersion, expectedTags } of TEST_DATA) {
        it(`upgrades to ${pickVersion} version`, async () => {
          await setUpRuleUpgrade({
            assets: [
              {
                installed: {
                  type: 'query',
                  tags: ['tagA'],
                  rule_id: 'rule_1',
                  version: 1,
                },
                patch: {
                  rule_id: 'rule_1',
                  tags: ['tagB'],
                },
                upgrade: {
                  type: 'query',
                  tags: ['tagC'],
                  rule_id: 'rule_1',
                  version: 2,
                },
              },
              {
                installed: {
                  type: 'query',
                  tags: ['tagA'],
                  rule_id: 'rule_2',
                  version: 1,
                },
                patch: {
                  rule_id: 'rule_2',
                  tags: ['tagB'],
                },
                upgrade: {
                  type: 'query',
                  tags: ['tagC'],
                  rule_id: 'rule_2',
                  version: 2,
                },
              },
            ],
            deps,
          });

          const response = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.ALL_RULES,
            pick_version: pickVersion,
          });

          expect(response.summary).toMatchObject({
            total: 2,
            succeeded: 2,
            skipped: 0,
            failed: 0,
          });
          expect(response.results.updated).toHaveLength(2);
          expect(response.results.updated).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                rule_id: 'rule_1',
                version: 2,
                tags: expectedTags,
              }),
              expect.objectContaining({
                rule_id: 'rule_2',
                version: 2,
                tags: expectedTags,
              }),
            ])
          );
        });
      }

      it(`upgrades to TARGET version when <pick version> is MERGED and there are no conflicts`, async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                type: 'query',
                tags: ['tagA'],
                rule_id: 'rule_1',
                version: 1,
              },
              patch: {},
              upgrade: {
                type: 'query',
                tags: ['tagC'],
                rule_id: 'rule_1',
                version: 2,
              },
            },
            {
              installed: {
                type: 'query',
                tags: ['tagA'],
                rule_id: 'rule_2',
                version: 1,
              },
              patch: {},
              upgrade: {
                type: 'query',
                tags: ['tagC'],
                rule_id: 'rule_2',
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'MERGED',
        });

        expect(response.summary).toMatchObject({
          total: 2,
          succeeded: 2,
          skipped: 0,
          failed: 0,
        });
        expect(response.results.updated).toHaveLength(2);
        expect(response.results.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: 'rule_1',
              version: 2,
              tags: ['tagC'],
            }),
            expect.objectContaining({
              rule_id: 'rule_2',
              version: 2,
              tags: ['tagC'],
            }),
          ])
        );
      });

      it('UNABLE to upgrade in case of conflicts when <pick version> is MERGED', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                type: 'query',
                tags: ['tagA'],
                rule_id: 'rule_1',
                version: 1,
              },
              patch: {
                rule_id: 'rule_1',
                tags: ['tagB'],
              },
              upgrade: {
                type: 'query',
                tags: ['tagC'],
                rule_id: 'rule_1',
                version: 2,
              },
            },
            {
              installed: {
                type: 'query',
                tags: ['tagA'],
                rule_id: 'rule_2',
                version: 1,
              },
              patch: {
                rule_id: 'rule_2',
                tags: ['tagB'],
              },
              upgrade: {
                type: 'query',
                tags: ['tagC'],
                rule_id: 'rule_2',
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'MERGED',
        });

        expect(response.summary).toMatchObject({
          total: 2,
          succeeded: 0,
          skipped: 0,
          failed: 2,
        });
        expect(response.errors).toHaveLength(2);
      });
    });

    describe('without historical versions', () => {
      const TEST_DATA = [
        { pickVersion: 'CURRENT', expectedTags: ['tagB'] },
        { pickVersion: 'TARGET', expectedTags: ['tagC'] },
      ] as const;

      for (const { pickVersion, expectedTags } of TEST_DATA) {
        it(`upgrades to ${pickVersion} version`, async () => {
          await setUpRuleUpgrade({
            assets: [
              {
                installed: {
                  type: 'query',
                  tags: ['tagA'],
                  rule_id: 'rule_1',
                  version: 1,
                },
                patch: {
                  rule_id: 'rule_1',
                  tags: ['tagB'],
                },
                upgrade: {
                  type: 'query',
                  tags: ['tagC'],
                  rule_id: 'rule_1',
                  version: 2,
                },
              },
              {
                installed: {
                  type: 'query',
                  tags: ['tagA'],
                  rule_id: 'rule_2',
                  version: 1,
                },
                patch: {
                  rule_id: 'rule_2',
                  tags: ['tagB'],
                },
                upgrade: {
                  type: 'query',
                  tags: ['tagC'],
                  rule_id: 'rule_2',
                  version: 2,
                },
              },
            ],
            removeInstalledAssets: true,
            deps,
          });

          const response = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.ALL_RULES,
            pick_version: pickVersion,
          });

          expect(response.summary).toMatchObject({
            total: 2,
            succeeded: 2,
            skipped: 0,
            failed: 0,
          });
          expect(response.results.updated).toHaveLength(2);
          expect(response.results.updated).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                rule_id: 'rule_1',
                version: 2,
                tags: expectedTags,
              }),
              expect.objectContaining({
                rule_id: 'rule_2',
                version: 2,
                tags: expectedTags,
              }),
            ])
          );
        });
      }

      for (const pickVersion of ['BASE', 'MERGED'] as const) {
        it(`UNABLE to upgrade to ${pickVersion} version`, async () => {
          await setUpRuleUpgrade({
            assets: [
              {
                installed: {
                  type: 'query',
                  tags: ['tagA'],
                  rule_id: 'rule_1',
                  version: 1,
                },
                patch: {
                  rule_id: 'rule_1',
                  tags: ['tagB'],
                },
                upgrade: {
                  type: 'query',
                  tags: ['tagC'],
                  rule_id: 'rule_1',
                  version: 2,
                },
              },
              {
                installed: {
                  type: 'query',
                  tags: ['tagA'],
                  rule_id: 'rule_2',
                  version: 1,
                },
                patch: {
                  rule_id: 'rule_2',
                  tags: ['tagB'],
                },
                upgrade: {
                  type: 'query',
                  tags: ['tagC'],
                  rule_id: 'rule_2',
                  version: 2,
                },
              },
            ],
            removeInstalledAssets: true,
            deps,
          });

          const response = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.ALL_RULES,
            pick_version: pickVersion,
          });

          expect(response.summary).toMatchObject({
            total: 2,
            succeeded: 0,
            skipped: 0,
            failed: 2,
          });
        });
      }
    });
  });
}
