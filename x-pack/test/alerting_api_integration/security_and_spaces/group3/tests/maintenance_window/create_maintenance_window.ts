/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

const scopedQuery = {
  kql: "_id: '1234'",
  filters: [
    {
      meta: {
        disabled: false,
        negate: false,
        alias: null,
        key: 'kibana.alert.action_group',
        field: 'kibana.alert.action_group',
        params: {
          query: 'test',
        },
        type: 'phrase',
      },
      $state: {
        store: 'appState',
      },
      query: {
        match_phrase: {
          'kibana.alert.action_group': 'test',
        },
      },
    },
  ],
};

// eslint-disable-next-line import/no-default-export
export default function createMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('createMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createParams = {
      title: 'test-maintenance-window',
      duration: 60 * 60 * 1000, // 1 hr
      r_rule: {
        dtstart: new Date().toISOString(),
        tzid: 'UTC',
        freq: 2, // weekly
      },
      category_ids: ['management'],
    };
    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle create maintenance window request appropriately', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              ...createParams,
              scoped_query: scopedQuery,
            });

          if (response.body.id) {
            objectRemover.add(
              space.id,
              response.body.id,
              'rules/maintenance_window',
              'alerting',
              true
            );
          }

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Forbidden',
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.title).to.eql('test-maintenance-window');
              expect(response.body.duration).to.eql(3600000);
              expect(response.body.r_rule.dtstart).to.eql(createParams.r_rule.dtstart);
              expect(response.body.events.length).to.be.greaterThan(0);
              expect(response.body.status).to.eql('running');
              expect(response.body.scoped_query.kql).to.eql("_id: '1234'");
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should create maintenance window with category ids', async () => {
      const response = await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          category_ids: ['observability', 'securitySolution'],
        })
        .expect(200);

      objectRemover.add('space1', response.body.id, 'rules/maintenance_window', 'alerting', true);

      expect(response.body.category_ids).eql(['observability', 'securitySolution']);
    });

    it('should throw if creating maintenance window with invalid categories', async () => {
      await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          category_ids: ['something-else'],
        })
        .expect(400);
    });

    it('should throw if creating maintenance window with invalid scoped query', async () => {
      await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          scoped_query: {
            kql: 'invalid_kql:',
            filters: [],
          },
        })
        .expect(400);
    });
  });
}
