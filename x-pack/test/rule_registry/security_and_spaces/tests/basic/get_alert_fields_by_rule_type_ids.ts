/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { RuleResponse as SecurityRuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response';
import {
  secOnlyRead,
  obsOnly,
  obsOnlyRead,
  noKibanaPrivileges,
  superUser,
  secOnlySpacesAllEsReadAll,
  obsSecReadSpacesAll,
  secOnlySpaces2EsReadAll,
} from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const SPACE1 = 'space1';
  const TEST_URL = '/internal/rac/alerts/fields';

  const createEsQueryRule = async (
    index: string,
    solution: 'stack' | 'observability',
    spaceId: string = 'default'
  ) => {
    const name = `${solution}-rule`;
    const { body: createdRule } = await supertest
      .post(`${getSpaceUrlPrefix(spaceId)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        rule_type_id: `.es-query`,
        enabled: true,
        schedule: { interval: '5s' },
        consumer: solution === 'stack' ? 'stackAlerts' : 'logs',
        tags: [name],
        params: {
          searchConfiguration: {
            query: {
              query: '',
              language: 'kuery',
            },
            index,
          },
          timeField: 'timestamp',
          searchType: 'searchSource',
          timeWindowSize: 5,
          timeWindowUnit: 'h',
          threshold: [-1],
          thresholdComparator: '>',
          size: 1,
          aggType: 'count',
          groupBy: 'all',
          termSize: 5,
          excludeHitsFromPreviousRun: false,
          sourceFields: [],
        },
      })
      .expect(200);
    return createdRule;
  };

  const createSecurityRule = async (index: string, spaceId: string = 'default') => {
    const { body: createdRule } = await supertest
      .post(`${getSpaceUrlPrefix(spaceId)}/api/detection_engine/rules`)
      .set('kbn-xsrf', 'foo')
      .send({
        type: 'query',
        filters: [],
        language: 'kuery',
        query: '_id: *',
        required_fields: [],
        data_view_id: index,
        author: [],
        false_positives: [],
        references: [],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        threat: [],
        max_signals: 100,
        name: 'security-rule',
        description: 'security-rule',
        tags: ['security-rule'],
        setup: '',
        license: '',
        interval: '5s',
        from: 'now-10m',
        to: 'now',
        actions: [],
        enabled: true,
        meta: {
          kibana_siem_app_url: 'http://localhost:5601/app/security',
        },
      })
      .expect(200);
    return createdRule;
  };

  const getAlertFieldsByFeatureId = async (
    user: User,
    ruleTypeIds: string[],
    spaceId: string = 'default',
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(spaceId)}${TEST_URL}`)
      .query({ ruleTypeIds })
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);

    return resp.body;
  };

  const getSampleWebLogsDataView = async () => {
    const { body } = await supertest
      .post(`${getSpaceUrlPrefix(SPACE1)}/api/content_management/rpc/search`)
      .set('kbn-xsrf', 'foo')
      .send({
        contentTypeId: 'index-pattern',
        query: { limit: 10 },
        version: 1,
      })
      .expect(200);
    return body.result.result.hits.find(
      (dataView: { attributes: { title: string } }) =>
        dataView.attributes.title === 'kibana_sample_data_logs'
    );
  };

  const deleteRule = async (ruleId: string, spaceId: string = 'default') => {
    await supertest
      .delete(`${getSpaceUrlPrefix(spaceId)}/api/alerting/rule/${ruleId}`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  };

  describe('Alert - Get alert fields by rule type IDs', () => {
    const ruleTypeIds = [
      ...OBSERVABILITY_RULE_TYPE_IDS,
      '.es-query',
      'xpack.ml.anomaly_detection_alert',
    ];

    let stackRule: RuleResponse;
    let observabilityRule: RuleResponse;
    let securityRule: SecurityRuleResponse;

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
      await supertest
        .post(`${getSpaceUrlPrefix(SPACE1)}/api/sample_data/logs`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .expect(200);

      const dataView = await getSampleWebLogsDataView();
      [stackRule, observabilityRule, securityRule] = await Promise.all([
        createEsQueryRule(dataView.id, 'stack', SPACE1),
        createEsQueryRule(dataView.id, 'observability', SPACE1),
        createSecurityRule(dataView.id, SPACE1),
      ]);
    });

    after(async () => {
      await deleteRule(stackRule.id, SPACE1);
      await deleteRule(observabilityRule.id, SPACE1);
      await supertest
        .post(`${getSpaceUrlPrefix(SPACE1)}/api/detection_engine/rules/_bulk_action?dry_run=false`)
        .set('kbn-xsrf', 'foo')
        .send({
          action: 'delete',
          ids: [securityRule.id],
        })
        .expect(200);
      await supertest
        .delete(`${getSpaceUrlPrefix(SPACE1)}/api/sample_data/logs`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .expect(204);
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    describe('Users:', () => {
      it(`${superUser.username} should be able to get alert fields for all rule types`, async () => {
        await retry.try(async () => {
          const resp = await getAlertFieldsByFeatureId(superUser, [], SPACE1);

          expect(Object.keys(resp.alertFields)).toEqual(['base', 'event', 'kibana', 'signal']);
        });
      });

      it(`${superUser.username} should be able to get alert fields for o11y rule types`, async () => {
        await retry.try(async () => {
          const resp = await getAlertFieldsByFeatureId(superUser, ruleTypeIds, SPACE1);

          expect(Object.keys(resp.alertFields)).toEqual(['base', 'event', 'kibana']);
        });
      });

      it(`${superUser.username} should be able to get alert fields for siem rule types`, async () => {
        await retry.try(async () => {
          const resp = await getAlertFieldsByFeatureId(
            superUser,
            ['siem.queryRule', 'siem.esqlRule'],
            SPACE1
          );

          expect(Object.keys(resp.alertFields)).toEqual(['base', 'event', 'kibana', 'signal']);
        });
      });

      it(`${obsOnly.username} should be able to get non empty alert fields for o11y ruleTypeIds`, async () => {
        await retry.try(async () => {
          const resp = await getAlertFieldsByFeatureId(superUser, ruleTypeIds, SPACE1);

          expect(Object.keys(resp.alertFields)).toEqual(['base', 'event', 'kibana']);
        });
      });

      it(`${obsOnly.username} should be able to get non empty alert fields for all ruleTypeIds`, async () => {
        await retry.try(async () => {
          const resp = await getAlertFieldsByFeatureId(superUser, [], SPACE1);

          expect(Object.keys(resp.alertFields)).toEqual(['base', 'event', 'kibana', 'signal']);
        });
      });

      it(`${obsSecReadSpacesAll.username} should be able to get non empty alert fields for o11y ruleTypeIds`, async () => {
        await retry.try(async () => {
          const resp = await getAlertFieldsByFeatureId(superUser, ruleTypeIds, SPACE1);

          expect(Object.keys(resp.alertFields)).toEqual(['base', 'event', 'kibana']);
        });
      });

      it(`${obsOnlyRead.username} should be able to get non empty alert fields for siem ruleTypeIds`, async () => {
        await retry.try(async () => {
          const resp = await getAlertFieldsByFeatureId(
            superUser,
            ['siem.queryRule', 'siem.esqlRule'],
            SPACE1
          );

          expect(Object.keys(resp.alertFields)).toEqual(['base', 'event', 'kibana', 'signal']);
        });
      });

      it(`${secOnlySpacesAllEsReadAll.username} should be able to get alert fields for siem rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(
          secOnlySpacesAllEsReadAll,
          ['siem.queryRule'],
          SPACE1
        );

        expect(Object.keys(resp.alertFields)).toEqual(['base', 'event', 'kibana', 'signal']);
      });

      it(`${secOnlySpaces2EsReadAll.username} should NOT be able to get alert fields for siem rule types`, async () => {
        await getAlertFieldsByFeatureId(secOnlySpaces2EsReadAll, ['siem.queryRule'], 'space2', 401);
      });

      it(`${secOnlyRead.username} should NOT be able to get alert fields for siem rule types due to lack of ES access`, async () => {
        await getAlertFieldsByFeatureId(secOnlyRead, ['siem.queryRule'], SPACE1, 403);
      });

      it(`${noKibanaPrivileges.username} should NOT be able to get alert fields`, async () => {
        await getAlertFieldsByFeatureId(noKibanaPrivileges, [], SPACE1, 403);
      });
    });
  });
};
