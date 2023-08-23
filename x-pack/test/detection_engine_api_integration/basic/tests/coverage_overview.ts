/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL,
  ThreatArray,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  createRule,
  deleteAllRules,
  getSimpleRule,
  installPrebuiltRulesAndTimelines,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('coverage_overview', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('without filters', () => {
      it('returns an empty response if there are no rules', async () => {
        const { body } = await supertest
          .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
          .set('kbn-xsrf', 'true')
          .send({})
          .expect(200);

        expect(body).to.eql({
          coverage: {},
          unmapped_rule_ids: [],
          rules_data: {},
        });
      });

      it('returns response with a single rule mapped to MITRE categories', async () => {
        const rule1 = await createRule(supertest, log, {
          ...getSimpleRule(),
          threat: generateThreatArray(1),
        });

        const { body } = await supertest
          .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
          .set('kbn-xsrf', 'true')
          .send({})
          .expect(200);

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
              name: 'Simple Rule Query',
            },
          },
        });
      });

      it('returns response with an unmapped rule', async () => {
        const rule1 = await createRule(supertest, log, { ...getSimpleRule(), threat: undefined });

        const { body } = await supertest
          .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
          .set('kbn-xsrf', 'true')
          .send({})
          .expect(200);

        expect(body).to.eql({
          coverage: {},
          unmapped_rule_ids: [rule1.id],
          rules_data: {
            [rule1.id]: {
              activity: 'disabled',
              name: 'Simple Rule Query',
            },
          },
        });
      });
    });

    describe('with filters', () => {
      describe('search_term', () => {
        it('returns response filtered by tactic', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            threat: generateThreatArray(1),
          });
          const expectedRule = await createRule(supertest, log, {
            ...getSimpleRule('rule-2'),
            threat: generateThreatArray(2),
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                search_term: 'TA002',
              },
            })
            .expect(200);

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
                name: 'Simple Rule Query',
              },
            },
          });
        });

        it('returns response filtered by technique', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            threat: generateThreatArray(1),
          });
          const expectedRule = await createRule(supertest, log, {
            ...getSimpleRule('rule-2'),
            threat: generateThreatArray(2),
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                search_term: 'T002',
              },
            })
            .expect(200);

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
                name: 'Simple Rule Query',
              },
            },
          });
        });

        it('returns response filtered by subtechnique', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            threat: generateThreatArray(1),
          });
          const expectedRule = await createRule(supertest, log, {
            ...getSimpleRule('rule-2'),
            threat: generateThreatArray(2),
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                search_term: 'T002.002',
              },
            })
            .expect(200);

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
                name: 'Simple Rule Query',
              },
            },
          });
        });

        it('returns response filtered by rule name', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));
          const expectedRule = await createRule(supertest, log, {
            ...getSimpleRule('rule-2'),
            name: 'rule-2',
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                search_term: 'rule-2',
              },
            })
            .expect(200);

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
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            index: ['index-pattern-1'],
          });
          const expectedRule = await createRule(supertest, log, {
            ...getSimpleRule('rule-2'),
            index: ['index-pattern-2'],
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                search_term: 'index-pattern-2',
              },
            })
            .expect(200);

          expect(body).to.eql({
            coverage: {},
            unmapped_rule_ids: [expectedRule.id],
            rules_data: {
              [expectedRule.id]: {
                activity: 'disabled',
                name: 'Simple Rule Query',
              },
            },
          });
        });
      });

      describe('activity', () => {
        it('returns response filtered by disabled rules', async () => {
          const expectedRule = await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            threat: generateThreatArray(1),
          });
          await createRule(supertest, log, {
            ...getSimpleRule('rule-2', true),
            threat: generateThreatArray(2),
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                activity: ['disabled'],
              },
            })
            .expect(200);

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
                name: 'Simple Rule Query',
              },
            },
          });
        });

        it('returns response filtered by enabled rules', async () => {
          await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            threat: generateThreatArray(1),
          });
          const expectedRule = await createRule(supertest, log, {
            ...getSimpleRule('rule-2', true),
            threat: generateThreatArray(2),
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                activity: ['enabled'],
              },
            })
            .expect(200);

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
                name: 'Simple Rule Query',
              },
            },
          });
        });

        it('returns response filtered by enabled and disabled rules equal to response if enabled and disabled are not set', async () => {
          const expectedRule1 = await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            name: 'Disabled rule',
            threat: generateThreatArray(1),
          });
          const expectedRule2 = await createRule(supertest, log, {
            ...getSimpleRule('rule-2', true),
            name: 'Enabled rule',
            threat: generateThreatArray(2),
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                activity: ['enabled', 'disabled'],
              },
            })
            .expect(200);

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

          const expectedRule = await createRule(supertest, log, {
            ...getSimpleRule('rule-1'),
            threat: generateThreatArray(2),
          });

          const { body } = await supertest
            .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
            .set('kbn-xsrf', 'true')
            .send({
              filter: {
                source: ['custom'],
              },
            })
            .expect(200);

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
                name: 'Simple Rule Query',
              },
            },
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
