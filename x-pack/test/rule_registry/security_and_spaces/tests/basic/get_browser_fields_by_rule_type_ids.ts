/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { superUser, obsOnlySpacesAll, secOnlyRead } from '../../../common/lib/authentication/users';
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
  const TEST_URL = '/internal/rac/alerts/browser_fields';

  const esQueryRule = {
    tags: [],
    params: {
      searchType: 'esQuery',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      threshold: [1],
      thresholdComparator: '>',
      size: 100,
      esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
      aggType: 'count',
      groupBy: 'all',
      termSize: 5,
      excludeHitsFromPreviousRun: false,
      sourceFields: [],
      index: ['.kibana_alerting_cases'],
      timeField: 'updated_at',
    },
    schedule: {
      interval: '1m',
    },
    consumer: 'stackAlerts',
    name: 'Elasticsearch query rule',
    rule_type_id: '.es-query',
    actions: [],
    alert_delay: {
      active: 1,
    },
  };

  const getBrowserFieldsByFeatureId = async (
    user: User,
    ruleTypeIds: string[],
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
      .query({ ruleTypeIds })
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);

    return resp.body;
  };

  describe('Alert - Get browser fields by rule type IDs', () => {
    const ruleTypeIds = [
      ...OBSERVABILITY_RULE_TYPE_IDS,
      '.es-query',
      'xpack.ml.anomaly_detection_alert',
    ];
    let esQueryRuleId: string;

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
      const { body: createdESRule } = await supertest
        .post('/api/alerting/rule')
        .set('kbn-xsrf', 'foo')
        .send(esQueryRule)
        .expect(200);

      esQueryRuleId = createdESRule.id;
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
      await supertest.delete(`/api/alerting/rule/${esQueryRuleId}`).set('kbn-xsrf', 'foo');
    });

    describe('Users:', () => {
      it(`${obsOnlySpacesAll.username} should be able to get non empty browser fields for all o11y ruleTypeIds`, async () => {
        await retry.try(async () => {
          const resp = await getBrowserFieldsByFeatureId(superUser, ruleTypeIds);

          expect(Object.keys(resp.browserFields)).toEqual(['base', 'event', 'kibana']);
        });
      });

      it(`${superUser.username} should NOT be able to get browser fields for siem rule types`, async () => {
        await getBrowserFieldsByFeatureId(superUser, ['siem.queryRule'], 404);
      });

      it(`${secOnlyRead.username} should NOT be able to get browser fields for siem rule types`, async () => {
        await getBrowserFieldsByFeatureId(secOnlyRead, ['siem.queryRule'], 404);
      });
    });
  });
};
