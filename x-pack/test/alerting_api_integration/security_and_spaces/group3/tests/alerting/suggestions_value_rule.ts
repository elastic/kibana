/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { Spaces, UserAtSpaceScenarios } from '../../../scenarios';
import { getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

interface RuleSpace {
  body: any;
}

// eslint-disable-next-line import/no-default-export
export default function createRuleSuggestionValuesTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('rules/suggestions/values', () => {
    const objectRemover = new ObjectRemover(supertest);
    const space1 = Spaces[0].id;
    const space2 = Spaces[1].id;
    let ruleSpace1: RuleSpace = { body: {} };
    let ruleSpace2: RuleSpace = { body: {} };
    after(() => objectRemover.removeAll());
    before(async () => {
      ruleSpace1 = await supertest
        .post(`${getUrlPrefix(space1)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            tags: ['green', 'forest', 'fox'],
          })
        );
      objectRemover.add(space1, ruleSpace1.body.id, 'rule', 'alerting');

      ruleSpace2 = await supertest
        .post(`${getUrlPrefix(space2)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            tags: ['blue', 'ocean', 'fish'],
          })
        );
      objectRemover.add(space2, ruleSpace2.body.id, 'rule', 'alerting');
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle request appropriately to get suggestion values', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/rules/suggestions/values`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              field: 'alert.tags',
              filters: [],
              query: 'f',
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).toEqual(403);
              expect(response.body).toEqual({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).toEqual(200);
              expect(response.body).toEqual(expect.arrayContaining(['forest', 'fox']));
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('Get tags value suggestion for alert.tags in space 1', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(space1)}/internal/rules/suggestions/values`)
        .set('kbn-xsrf', 'foo')
        .send({
          field: 'alert.tags',
          filters: [],
          query: 'f',
        });
      expect(response.body).toEqual(expect.arrayContaining(['forest', 'fox']));
    });

    it('Get tags value suggestion for alert.tags in space 2', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(space2)}/internal/rules/suggestions/values`)
        .set('kbn-xsrf', 'foo')
        .send({
          field: 'alert.tags',
          filters: [],
          query: 'f',
        });
      expect(response.body).toEqual(expect.arrayContaining(['fish']));
    });
  });
}
