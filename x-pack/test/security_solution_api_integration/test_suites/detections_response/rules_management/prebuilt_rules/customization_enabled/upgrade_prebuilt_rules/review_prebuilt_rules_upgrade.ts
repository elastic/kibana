/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  fetchFirstPrebuiltRuleUpgradeReviewDiff,
} from '../../../../utils';
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

  describe('@ess @serverless @skipInServerlessMKI review prebuilt rules upgrade', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    for (const withHistoricalVersions of [true, false]) {
      describe(
        withHistoricalVersions ? 'with historical versions' : 'without historical versions',
        () => {
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

              const fieldsDiff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

              expect(fieldsDiff).toMatchObject({
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

              const fieldsDiff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

              expect(fieldsDiff).toMatchObject({
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

              const fieldsDiff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

              expect(fieldsDiff).toMatchObject({
                num_fields_with_non_solvable_conflicts: 1,
              });
            });
          });

          describe('fields diff', () => {
            it('returns fields diff for fields with upgrades', async () => {
              await setUpRuleUpgrade({
                assets: [
                  // description - non-customized
                  // name - customized
                  // tags - customized
                  {
                    installed: {
                      rule_id: 'query-rule',
                      type: 'query',
                      name: 'Initial name',
                      description: 'Initial description',
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
                      description: 'Updated description',
                      tags: ['tabC'],
                      version: 2,
                    },
                  },
                ],
                removeInstalledAssets: !withHistoricalVersions,
                deps,
              });

              const fieldsDiff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

              expect(fieldsDiff.fields).toMatchObject({
                name: {
                  has_update: true,
                },
                description: {
                  has_update: true,
                },
                tags: {
                  has_update: true,
                },
              });
            });

            it(`asserts "has_update" is ${!withHistoricalVersions} for customized fields without upgrades`, async () => {
              await setUpRuleUpgrade({
                assets: [
                  {
                    installed: {
                      rule_id: 'query-rule',
                      type: 'query',
                      alert_suppression: { group_by: ['fieldA'] },
                      index: ['indexA'],
                      interval: '5m',
                      from: 'now-20m',
                      to: 'now',
                      version: 1,
                    },
                    patch: {
                      rule_id: 'query-rule',
                      alert_suppression: { group_by: ['fieldB'] },
                      index: ['indexB'],
                      interval: '3m',
                      from: 'now-10m',
                    },
                    upgrade: {
                      rule_id: 'query-rule',
                      type: 'query',
                      alert_suppression: { group_by: ['fieldA'] },
                      index: ['indexA'],
                      interval: '5m',
                      from: 'now-20m',
                      to: 'now',
                      version: 2,
                    },
                  },
                ],
                removeInstalledAssets: !withHistoricalVersions,
                deps,
              });

              const fieldsDiff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

              expect(fieldsDiff.fields).toMatchObject({
                alert_suppression: {
                  has_update: !withHistoricalVersions,
                },
                data_source: {
                  has_update: !withHistoricalVersions,
                },
                rule_schedule: {
                  has_update: !withHistoricalVersions,
                },
              });
            });

            it('asserts returned fields diff have base version', async () => {
              await setUpRuleUpgrade({
                assets: [
                  {
                    installed: {
                      rule_id: 'query-rule',
                      type: 'query',
                      note: 'Initial note',
                      max_signals: 100,
                      risk_score: 10,
                    },
                    patch: {
                      rule_id: 'query-rule',
                      max_signals: 150,
                      risk_score: 20,
                    },
                    upgrade: {
                      rule_id: 'query-rule',
                      type: 'query',
                      note: 'Updated note',
                      max_signals: 100,
                      risk_score: 30,
                      version: 2,
                    },
                  },
                ],
                removeInstalledAssets: !withHistoricalVersions,
                deps,
              });

              const fieldsDiff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

              expect(fieldsDiff.fields).toMatchObject({
                note: {
                  has_base_version: withHistoricalVersions,
                },
                max_signals: {
                  has_base_version: withHistoricalVersions,
                },
                risk_score: {
                  has_base_version: withHistoricalVersions,
                },
              });
            });
          });
        }
      );
    }
  });
};
