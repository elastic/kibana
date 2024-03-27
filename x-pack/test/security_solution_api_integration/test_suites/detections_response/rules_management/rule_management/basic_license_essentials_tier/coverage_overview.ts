/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
  RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL,
  ThreatArray,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  installPrebuiltRulesAndTimelines,
  installPrebuiltRules,
  getCustomQueryRuleParams,
  createNonSecurityRule,
} from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../../common/utils/security_solution';
import { getCoverageOverview } from '../../../utils/rules/get_coverage_overview';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('coverage_overview', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    // ESS only
    describe('@ess specific tests', () => {
      it('does NOT error when there exist some stack rules in addition to security detection rules', async () => {
        await createNonSecurityRule(supertest);

        const rule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({ threat: generateThreatArray(1) })
        );

        const body = await getCoverageOverview(supertest);

        expect(body).to.eql({
          coverage: {
            T001: [rule1.id],
            TA001: [rule1.id],
            'T001.001': [rule1.id],
          },
          unmapped_rule_ids: [],
          rules_data: {
            [rule1.id]: {
              activity: 'disabled',
              name: 'Custom query rule',
            },
          },
        });
      });
    });

    // Both serverless and ESS
    describe('@serverless @ess tests', () => {
      describe('base cases', () => {
        it('returns an empty response if there are no rules', async () => {
          const body = await getCoverageOverview(supertest);

          expect(body).to.eql({
            coverage: {},
            unmapped_rule_ids: [],
            rules_data: {},
          });
        });

        it('returns response with a single rule mapped to MITRE categories', async () => {
          const rule1 = await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({ threat: generateThreatArray(1) })
          );

          const body = await getCoverageOverview(supertest);

          expect(body).to.eql({
            coverage: {
              T001: [rule1.id],
              TA001: [rule1.id],
              'T001.001': [rule1.id],
            },
            unmapped_rule_ids: [],
            rules_data: {
              [rule1.id]: {
                activity: 'disabled',
                name: 'Custom query rule',
              },
            },
          });
        });

        it('returns response with an unmapped rule', async () => {
          const rule1 = await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({ threat: undefined })
          );

          const body = await getCoverageOverview(supertest);

          expect(body).to.eql({
            coverage: {},
            unmapped_rule_ids: [rule1.id],
            rules_data: {
              [rule1.id]: {
                activity: 'disabled',
                name: 'Custom query rule',
              },
            },
          });
        });
      });

      describe('with filters', () => {
        describe('search_term', () => {
          it('returns response filtered by tactic', async () => {
            await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(1) })
            );
            const expectedRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-2', threat: generateThreatArray(2) })
            );

            const body = await getCoverageOverview(supertest, {
              search_term: 'TA002',
            });

            expect(body).to.eql({
              coverage: {
                T002: [expectedRule.id],
                TA002: [expectedRule.id],
                'T002.002': [expectedRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'disabled',
                  name: 'Custom query rule',
                },
              },
            });
          });

          it('returns response filtered by technique', async () => {
            await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(1) })
            );
            const expectedRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-2', threat: generateThreatArray(2) })
            );

            const body = await getCoverageOverview(supertest, {
              search_term: 'T002',
            });

            expect(body).to.eql({
              coverage: {
                T002: [expectedRule.id],
                TA002: [expectedRule.id],
                'T002.002': [expectedRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'disabled',
                  name: 'Custom query rule',
                },
              },
            });
          });

          it('returns response filtered by subtechnique', async () => {
            await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(1) })
            );
            const expectedRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-2', threat: generateThreatArray(2) })
            );

            const body = await getCoverageOverview(supertest, {
              search_term: 'T002.002',
            });

            expect(body).to.eql({
              coverage: {
                T002: [expectedRule.id],
                TA002: [expectedRule.id],
                'T002.002': [expectedRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'disabled',
                  name: 'Custom query rule',
                },
              },
            });
          });

          it('returns response filtered by rule name', async () => {
            await createRule(supertest, log, getCustomQueryRuleParams({ rule_id: 'rule-1' }));
            const expectedRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-2', name: 'rule-2' })
            );

            const body = await getCoverageOverview(supertest, {
              search_term: 'rule-2',
            });

            expect(body).to.eql({
              coverage: {},
              unmapped_rule_ids: [expectedRule.id],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'disabled',
                  name: 'rule-2',
                },
              },
            });
          });

          it('returns response filtered by index pattern', async () => {
            await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', index: ['index-pattern-1'] })
            );
            const expectedRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-2', index: ['index-pattern-2'] })
            );

            const body = await getCoverageOverview(supertest, {
              search_term: 'index-pattern-2',
            });

            expect(body).to.eql({
              coverage: {},
              unmapped_rule_ids: [expectedRule.id],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'disabled',
                  name: 'Custom query rule',
                },
              },
            });
          });
        });

        describe('activity', () => {
          it('returns response filtered by disabled rules', async () => {
            const expectedRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(1) })
            );
            await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({
                rule_id: 'rule-2',
                enabled: true,
                threat: generateThreatArray(2),
              })
            );

            const body = await getCoverageOverview(supertest, {
              activity: [CoverageOverviewRuleActivity.Disabled],
            });

            expect(body).to.eql({
              coverage: {
                T001: [expectedRule.id],
                TA001: [expectedRule.id],
                'T001.001': [expectedRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'disabled',
                  name: 'Custom query rule',
                },
              },
            });
          });

          it('returns response filtered by enabled rules', async () => {
            await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(1) })
            );
            const expectedRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({
                rule_id: 'rule-2',
                enabled: true,
                threat: generateThreatArray(2),
              })
            );

            const body = await getCoverageOverview(supertest, {
              activity: [CoverageOverviewRuleActivity.Enabled],
            });

            expect(body).to.eql({
              coverage: {
                T002: [expectedRule.id],
                TA002: [expectedRule.id],
                'T002.002': [expectedRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'enabled',
                  name: 'Custom query rule',
                },
              },
            });
          });

          it('returns all rules if both enabled and disabled filters are specified in the request', async () => {
            const expectedRule1 = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({
                rule_id: 'rule-1',
                enabled: false,
                name: 'Disabled rule',
                threat: generateThreatArray(1),
              })
            );
            const expectedRule2 = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({
                rule_id: 'rule-2',
                enabled: true,
                name: 'Enabled rule',
                threat: generateThreatArray(2),
              })
            );

            const body = await getCoverageOverview(supertest, {
              activity: [
                CoverageOverviewRuleActivity.Enabled,
                CoverageOverviewRuleActivity.Disabled,
              ],
            });

            expect(body).to.eql({
              coverage: {
                T001: [expectedRule1.id],
                TA001: [expectedRule1.id],
                'T001.001': [expectedRule1.id],
                T002: [expectedRule2.id],
                TA002: [expectedRule2.id],
                'T002.002': [expectedRule2.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule1.id]: {
                  activity: 'disabled',
                  name: 'Disabled rule',
                },
                [expectedRule2.id]: {
                  activity: 'enabled',
                  name: 'Enabled rule',
                },
              },
            });
          });

          it('returns all rules if neither enabled and disabled filters are specified in the request', async () => {
            const expectedRule1 = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({
                rule_id: 'rule-1',
                enabled: false,
                name: 'Disabled rule',
                threat: generateThreatArray(1),
              })
            );
            const expectedRule2 = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({
                rule_id: 'rule-2',
                enabled: true,
                name: 'Enabled rule',
                threat: generateThreatArray(2),
              })
            );

            const body = await getCoverageOverview(supertest);

            expect(body).to.eql({
              coverage: {
                T001: [expectedRule1.id],
                TA001: [expectedRule1.id],
                'T001.001': [expectedRule1.id],
                T002: [expectedRule2.id],
                TA002: [expectedRule2.id],
                'T002.002': [expectedRule2.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule1.id]: {
                  activity: 'disabled',
                  name: 'Disabled rule',
                },
                [expectedRule2.id]: {
                  activity: 'enabled',
                  name: 'Enabled rule',
                },
              },
            });
          });
        });

        describe('source', () => {
          it('returns response filtered by custom rules', async () => {
            await createPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'prebuilt-rule-1',
                threat: generateThreatArray(1),
              }),
            ]);
            await installPrebuiltRulesAndTimelines(es, supertest);

            const expectedRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(2) })
            );

            const body = await getCoverageOverview(supertest, {
              source: [CoverageOverviewRuleSource.Custom],
            });

            expect(body).to.eql({
              coverage: {
                T002: [expectedRule.id],
                TA002: [expectedRule.id],
                'T002.002': [expectedRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'disabled',
                  name: 'Custom query rule',
                },
              },
            });
          });

          it('returns response filtered by prebuilt rules', async () => {
            await createPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'prebuilt-rule-1',
                threat: generateThreatArray(1),
              }),
            ]);
            const {
              results: { created },
            } = await installPrebuiltRules(es, supertest);
            const expectedRule = created[0];

            await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(2) })
            );

            const body = await getCoverageOverview(supertest, {
              source: [CoverageOverviewRuleSource.Prebuilt],
            });

            expect(body).to.eql({
              coverage: {
                T001: [expectedRule.id],
                TA001: [expectedRule.id],
                'T001.001': [expectedRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedRule.id]: {
                  activity: 'disabled',
                  name: 'Query with a rule id',
                },
              },
            });
          });

          it('returns all rules if both custom and prebuilt filters are specified in the request', async () => {
            await createPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'prebuilt-rule-1',
                threat: generateThreatArray(1),
              }),
            ]);
            const {
              results: { created },
            } = await installPrebuiltRules(es, supertest);
            const expectedPrebuiltRule = created[0];

            const expectedCustomRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(2) })
            );

            const body = await getCoverageOverview(supertest, {
              source: [CoverageOverviewRuleSource.Prebuilt, CoverageOverviewRuleSource.Custom],
            });

            expect(body).to.eql({
              coverage: {
                T001: [expectedPrebuiltRule.id],
                TA001: [expectedPrebuiltRule.id],
                'T001.001': [expectedPrebuiltRule.id],
                T002: [expectedCustomRule.id],
                TA002: [expectedCustomRule.id],
                'T002.002': [expectedCustomRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedPrebuiltRule.id]: {
                  activity: 'disabled',
                  name: 'Query with a rule id',
                },
                [expectedCustomRule.id]: {
                  activity: 'disabled',
                  name: 'Custom query rule',
                },
              },
            });
          });

          it('returns all rules if neither custom and prebuilt filters are specified in the request', async () => {
            await createPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'prebuilt-rule-1',
                threat: generateThreatArray(1),
              }),
            ]);
            const {
              results: { created },
            } = await installPrebuiltRules(es, supertest);
            const expectedPrebuiltRule = created[0];

            const expectedCustomRule = await createRule(
              supertest,
              log,
              getCustomQueryRuleParams({ rule_id: 'rule-1', threat: generateThreatArray(2) })
            );

            const body = await getCoverageOverview(supertest);

            expect(body).to.eql({
              coverage: {
                T001: [expectedPrebuiltRule.id],
                TA001: [expectedPrebuiltRule.id],
                'T001.001': [expectedPrebuiltRule.id],
                T002: [expectedCustomRule.id],
                TA002: [expectedCustomRule.id],
                'T002.002': [expectedCustomRule.id],
              },
              unmapped_rule_ids: [],
              rules_data: {
                [expectedPrebuiltRule.id]: {
                  activity: 'disabled',
                  name: 'Query with a rule id',
                },
                [expectedCustomRule.id]: {
                  activity: 'disabled',
                  name: 'Custom query rule',
                },
              },
            });
          });
        });
      });

      describe('error cases', async () => {
        it('throws error when request body is not valid', async () => {
          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '1')
            .set('x-elastic-internal-origin', 'foo')
            .send({ filter: { source: ['give me all the rules'] } })
            .expect(400);

          expect(body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              '[request body]: Invalid value "give me all the rules" supplied to "filter,source"',
          });
        });
      });
    });
  });
};

function generateThreatArray(startIndex: number, count = 1): ThreatArray {
  const result: ThreatArray = [];

  for (let i = 0; i < count; ++i) {
    const indexName = (i + startIndex).toString().padStart(3, '0');

    result.push({
      framework: 'MITRE ATT&CK',
      tactic: {
        id: `TA${indexName}`,
        name: `Tactic ${indexName}`,
        reference: `http://some-link-${indexName}`,
      },
      technique: [
        {
          id: `T${indexName}`,
          name: `Technique ${indexName}`,
          reference: `http://some-technique-link-${indexName}`,
          subtechnique: [
            {
              id: `T${indexName}.${indexName}`,
              name: `Subtechnique ${indexName}`,
              reference: `http://some-sub-technique-link-${indexName}`,
            },
          ],
        },
      ],
    });
  }

  return result;
}
