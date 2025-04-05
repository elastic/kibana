/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  MappingProperty,
  PropertyName,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import { alertFieldMap, type Alert } from '@kbn/alerts-as-data-utils';
import { TOTAL_FIELDS_LIMIT } from '@kbn/alerting-plugin/server';
import { get } from 'lodash';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { Spaces } from '../../../../scenarios';
import {
  getEventLog,
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
} from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createAlertsAsDataDynamicTemplatesTest({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertestWithoutAuth);

  const alertsAsDataIndex =
    '.internal.alerts-observability.test.alerts.dynamic.templates.alerts-default-000001';

  describe('alerts as data dynamic templates', function () {
    this.tags('skipFIPS');
    afterEach(async () => {
      await objectRemover.removeAll();
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    it(`should add the dynamic fields`, async () => {
      const createdRule = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing-alert-as-data-with-dynamic-templates',
            schedule: { interval: '1d' },
            throttle: null,
            params: {},
            actions: [],
          })
        );
      expect(createdRule.status).to.eql(200);
      const ruleId = createdRule.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      const existingFields = alertFieldMap;

      const numberOfExistingFields = Object.keys(existingFields).length;
      // there is no way to get the real number of fields from ES.
      // Eventhough we have only as many as alertFieldMap fields,
      // ES counts the each childs of the nested objects and multi_fields as seperate fields.
      // therefore we add 9 to get the real number.
      const nestedObjectsAndMultiFields = 9;
      // Number of free slots that we want to have, so we can add dynamic fields as many
      const numberofFreeSlots = 3;
      const totalFields = numberOfExistingFields + nestedObjectsAndMultiFields + numberofFreeSlots;

      const dummyFields: Record<PropertyName, MappingProperty> = {};
      for (let i = 0; i < TOTAL_FIELDS_LIMIT - totalFields; i++) {
        const key = `${i}`.padStart(4, '0');
        dummyFields[key] = { type: 'keyword' };
      }
      // add dummyFields to the index mappings, so it will reach the fields limits.
      await es.indices.putMapping({
        index: alertsAsDataIndex,
        properties: dummyFields,
        dynamic: false,
      });

      await supertestWithoutAuth
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            schedule: { interval: '1d' },
            throttle: null,
            params: {
              dynamic_fields: { 'host.id': '1', 'host.name': 'host-1' },
            },
            actions: [],
            enabled: undefined,
            rule_type_id: undefined,
            consumer: undefined,
          })
        )
        .expect(200);

      const runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 1 }]]));

      // Query for alerts
      const alerts = await queryForAlertDocs<Alert>();
      const alert = alerts[0];

      // host.name is ignored
      expect(alert._ignored).to.eql(['kibana.alert.dynamic.host.name']);

      const mapping = await es.indices.getMapping({ index: alertsAsDataIndex });
      const dynamicFiled = get(
        mapping[alertsAsDataIndex],
        'mappings.properties.kibana.properties.alert.properties.dynamic.properties.host.properties.id.type'
      );

      // new dynamic field has been added
      expect(dynamicFiled).to.eql('text');
    });
  });

  async function queryForAlertDocs<T>(): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index: alertsAsDataIndex,
      query: { match_all: {} },
    });
    return searchResult.hits.hits as Array<SearchHit<T>>;
  }

  async function waitForEventLogDocs(
    id: string,
    actions: Map<string, { gte: number } | { equal: number }>
  ) {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions,
      });
    });
  }
}
