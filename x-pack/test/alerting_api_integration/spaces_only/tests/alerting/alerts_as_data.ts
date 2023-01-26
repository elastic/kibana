/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { type Alert, alertFieldMap } from '@kbn/alerting-plugin/common/alert_schema';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common/alert_schema/field_maps/mapping_from_field_map';
import expect from '@kbn/expect';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { Spaces } from '../../scenarios';
import { getEventLog, getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertsAsDataTest({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const commonFrameworkMappings = mappingFromFieldMap(alertFieldMap, 'strict');
  const objectRemover = new ObjectRemover(supertestWithoutAuth);

  type PatternFiringAlert = Alert & { patternIndex: number; instancePattern: boolean[] };
  const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

  describe('alerts as data', () => {
    afterEach(() => objectRemover.removeAll());
    it('should install common alerts as data resources on startup', async () => {
      const ilmPolicyName = 'alerts-default-ilm-policy';
      const componentTemplateName = 'alerts-common-component-template';

      const commonIlmPolicy = await es.ilm.getLifecycle({
        name: ilmPolicyName,
      });

      expect(commonIlmPolicy[ilmPolicyName].policy).to.eql({
        _meta: {
          managed: true,
        },
        phases: {
          hot: {
            min_age: '0ms',
            actions: {
              rollover: {
                max_age: '30d',
                max_primary_shard_size: '50gb',
              },
            },
          },
        },
      });

      const { component_templates: componentTemplates } = await es.cluster.getComponentTemplate({
        name: componentTemplateName,
      });

      expect(componentTemplates.length).to.eql(1);
      const commonComponentTemplate = componentTemplates[0];

      expect(commonComponentTemplate.name).to.eql(componentTemplateName);
      expect(commonComponentTemplate.component_template.template.mappings).to.eql(
        commonFrameworkMappings
      );
      expect(commonComponentTemplate.component_template.template.settings).to.eql({
        index: {
          number_of_shards: 1,
          mapping: {
            total_fields: {
              limit: 100,
            },
          },
        },
      });
    });

    it('should install context specific alerts as data resources on startup', async () => {
      const componentTemplateName = 'alerts-test.patternfiring-component-template';
      const indexTemplateName = '.alerts-test.patternfiring-default-template';
      const indexName = '.alerts-test.patternfiring-default-000001';
      const contextSpecificMappings = {
        patternIndex: {
          type: 'long',
        },
        instancePattern: {
          type: 'boolean',
        },
      };

      const { component_templates: componentTemplates } = await es.cluster.getComponentTemplate({
        name: componentTemplateName,
      });
      expect(componentTemplates.length).to.eql(1);
      const contextComponentTemplate = componentTemplates[0];
      expect(contextComponentTemplate.name).to.eql(componentTemplateName);
      expect(contextComponentTemplate.component_template.template.mappings).to.eql({
        dynamic: 'strict',
        properties: contextSpecificMappings,
      });
      expect(contextComponentTemplate.component_template.template.settings).to.eql({
        index: {
          number_of_shards: 1,
          mapping: {
            total_fields: {
              limit: 100,
            },
          },
        },
      });

      const { index_templates: indexTemplates } = await es.indices.getIndexTemplate({
        name: indexTemplateName,
      });
      expect(indexTemplates.length).to.eql(1);
      const contextIndexTemplate = indexTemplates[0];
      expect(contextIndexTemplate.name).to.eql(indexTemplateName);
      expect(contextIndexTemplate.index_template.index_patterns).to.eql([
        '.alerts-test.patternfiring-default-*',
      ]);
      expect(contextIndexTemplate.index_template.composed_of).to.eql([
        'alerts-common-component-template',
        'alerts-test.patternfiring-component-template',
      ]);
      expect(contextIndexTemplate.index_template.template!.mappings).to.eql({
        dynamic: false,
      });
      expect(contextIndexTemplate.index_template.template!.settings).to.eql({
        index: {
          lifecycle: {
            name: 'alerts-default-ilm-policy',
            rollover_alias: '.alerts-test.patternfiring-default',
          },
          mapping: {
            total_fields: {
              limit: '2500',
            },
          },
          hidden: 'true',
          auto_expand_replicas: '0-1',
        },
      });

      const contextIndex = await es.indices.get({
        index: indexName,
      });

      expect(contextIndex[indexName].aliases).to.eql({
        '.alerts-test.patternfiring-default': {
          is_write_index: true,
        },
      });

      expect(contextIndex[indexName].mappings).to.eql({
        dynamic: 'false',
        properties: {
          ...contextSpecificMappings,
          ...commonFrameworkMappings.properties,
        },
      });

      expect(contextIndex[indexName].settings?.index?.lifecycle).to.eql({
        name: 'alerts-default-ilm-policy',
        rollover_alias: '.alerts-test.patternfiring-default',
      });

      expect(contextIndex[indexName].settings?.index?.mapping).to.eql({
        total_fields: {
          limit: '2500',
        },
      });

      expect(contextIndex[indexName].settings?.index?.hidden).to.eql('true');
      expect(contextIndex[indexName].settings?.index?.number_of_shards).to.eql(1);
      expect(contextIndex[indexName].settings?.index?.auto_expand_replicas).to.eql('0-1');
      expect(contextIndex[indexName].settings?.index?.provided_name).to.eql(
        '.alerts-test.patternfiring-default-000001'
      );
    });

    it('should write alert docs during rule execution', async () => {
      const pattern = {
        alertA: [true, true, true], // stays active across executions
        alertB: [true, false, false], // active then recovers
        alertC: [true, false, true], // active twice
      };
      const ruleParameters = {
        pattern,
        useLegacy: false,
      };
      const createdRule = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            // set the schedule long so we can use "runSoon" to specify rule runs
            schedule: { interval: '1d' },
            throttle: null,
            params: ruleParameters,
            actions: [],
          })
        );

      expect(createdRule.status).to.eql(200);
      const ruleId = createdRule.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // --------------------------
      // RUN 1 - 3 new alerts
      // --------------------------
      // Wait for the event log execute doc so we can get the execution UUID
      let events: IValidatedEvent[] = await waitForEventLogDocs(
        ruleId,
        new Map([['execute', { equal: 1 }]])
      );
      let executeEvent = events[0];
      let executionUuid = executeEvent?.kibana?.alert?.rule?.execution?.uuid;
      expect(executionUuid).not.to.be(undefined);

      // Query for alerts by execution UUID
      const alertDocsRun1 = await queryForAlertDocs<PatternFiringAlert>(executionUuid!);
      console.log(`alertDocsRun1 ${JSON.stringify(alertDocsRun1)}`);

      // After the first run, we should have 3 alert docs for the 3 active alerts
      expect(alertDocsRun1.length).to.equal(3);

      testExpectRuleData(alertDocsRun1, ruleId, ruleParameters, executionUuid!);
      for (let i = 0; i < alertDocsRun1.length; ++i) {
        const source: PatternFiringAlert = alertDocsRun1[i]._source!;

        // Each doc should have active status and default action group id
        expect(source['kibana.alert.action_group']).to.equal('default');

        // patternIndex should be 0 for the first run
        expect(source.patternIndex).to.equal(0);

        // alert UUID should equal doc id
        expect(source['kibana.alert.uuid']).to.equal(alertDocsRun1[i]._id);

        // duration should be '0' since this is a new alert
        expect(source['kibana.alert.duration.us']).to.equal('0');

        // start should be defined
        expect(source['kibana.alert.start']).to.match(timestampPattern);

        // timestamp should be defined
        expect(source['@timestamp']).to.match(timestampPattern);

        // status should be active
        expect(source['kibana.alert.status']).to.equal('active');

        // flapping information for new alert
        expect(source['kibana.alert.flapping']).to.equal(false);
        expect(source['kibana.alert.flapping_history']).to.eql([true]);
      }

      let alertDoc: SearchHit<PatternFiringAlert> | undefined = alertDocsRun1.find(
        (doc) => doc._source!['kibana.alert.id'] === 'alertA'
      );
      const alertADocRun1 = alertDoc!._source!;
      expect(alertADocRun1.instancePattern).to.eql(pattern.alertA);

      alertDoc = alertDocsRun1.find((doc) => doc._source!['kibana.alert.id'] === 'alertB');
      const alertBDocRun1 = alertDoc!._source!;
      expect(alertBDocRun1.instancePattern).to.eql(pattern.alertB);

      alertDoc = alertDocsRun1.find((doc) => doc._source!['kibana.alert.id'] === 'alertC');
      const alertCDocRun1 = alertDoc!._source!;
      expect(alertCDocRun1.instancePattern).to.eql(pattern.alertC);

      // --------------------------
      // RUN 2 - 2 recovered (alertB, alertC), 1 ongoing (alertA)
      // --------------------------
      let response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);

      // Wait for the event log execute doc so we can get the execution UUID
      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 2 }]]));
      executeEvent = events[1];
      executionUuid = executeEvent?.kibana?.alert?.rule?.execution?.uuid;
      expect(executionUuid).not.to.be(undefined);

      // Query for alerts by execution UUID
      const alertDocsRun2 = await queryForAlertDocs<PatternFiringAlert>(executionUuid!);
      console.log(`alertDocsRun2 ${JSON.stringify(alertDocsRun2)}`);

      // After the second run, we should have 3 alert docs
      expect(alertDocsRun2.length).to.equal(3);

      testExpectRuleData(alertDocsRun2, ruleId, ruleParameters, executionUuid!);
      for (let i = 0; i < alertDocsRun2.length; ++i) {
        const source: PatternFiringAlert = alertDocsRun2[i]._source!;

        // alert UUID should equal doc id
        // TODO - this is not working for recovered alerts
        // expect(source['kibana.alert.uuid']).to.equal(alertDocsRun2[i]._id);

        // duration should be greater than 0 since these are not new alerts
        const durationAsNumber = Number(source['kibana.alert.duration.us']);
        expect(durationAsNumber).to.be.greaterThan(0);
      }

      alertDoc = alertDocsRun2.find((doc) => doc._source!['kibana.alert.id'] === 'alertA');
      const alertADocRun2 = alertDoc!._source!;
      expect(alertADocRun2.instancePattern).to.eql(pattern.alertA);
      // patternIndex should be 1 for the second run
      expect(alertADocRun2.patternIndex).to.equal(1);
      expect(alertADocRun2['kibana.alert.action_group']).to.equal('default');
      // start time should be defined and the same as prior run
      expect(alertADocRun2['kibana.alert.start']).to.match(timestampPattern);
      expect(alertADocRun2['kibana.alert.start']).to.equal(alertADocRun1['kibana.alert.start']);
      // timestamp should be defined and not the same as prior run
      expect(alertADocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertADocRun2['@timestamp']).not.to.equal(alertADocRun1['@timestamp']);
      // status should still be active
      expect(alertADocRun2['kibana.alert.status']).to.equal('active');

      alertDoc = alertDocsRun2.find((doc) => doc._source!['kibana.alert.id'] === 'alertB');
      const alertBDocRun2 = alertDoc!._source!;
      // recovered alerts don't set action group or custom information
      expect(alertBDocRun2.instancePattern).to.be(undefined);
      expect(alertBDocRun2.patternIndex).to.be(undefined);
      expect(alertBDocRun2['kibana.alert.action_group']).to.be(undefined);
      // start time should be defined and the same as before
      expect(alertBDocRun2['kibana.alert.start']).to.match(timestampPattern);
      expect(alertBDocRun2['kibana.alert.start']).to.equal(alertBDocRun1['kibana.alert.start']);
      // timestamp should be defined and not the same as prior run
      expect(alertBDocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertBDocRun2['@timestamp']).not.to.equal(alertBDocRun1['@timestamp']);
      // end time should be defined
      expect(alertBDocRun2['kibana.alert.end']).to.match(timestampPattern);
      // status should be set to recovered
      expect(alertBDocRun2['kibana.alert.status']).to.equal('recovered');

      alertDoc = alertDocsRun2.find((doc) => doc._source!['kibana.alert.id'] === 'alertC');
      const alertCDocRun2 = alertDoc!._source!;
      // recovered alerts don't set action group or custom information
      expect(alertCDocRun2.instancePattern).to.be(undefined);
      expect(alertCDocRun2.patternIndex).to.be(undefined);
      expect(alertCDocRun2['kibana.alert.action_group']).to.be(undefined);
      // start time should be defined and the same as before
      expect(alertCDocRun2['kibana.alert.start']).to.match(timestampPattern);
      expect(alertCDocRun2['kibana.alert.start']).to.equal(alertCDocRun1['kibana.alert.start']);
      // timestamp should be defined and not the same as prior run
      expect(alertCDocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertCDocRun2['@timestamp']).not.to.equal(alertCDocRun1['@timestamp']);
      // end time should be defined
      expect(alertCDocRun2['kibana.alert.end']).to.match(timestampPattern);
      // status should be set to recovered
      expect(alertCDocRun2['kibana.alert.status']).to.equal('recovered');

      // --------------------------
      // RUN 3 - 1 re-active (alertC), 1 still recovered (alertB), 1 ongoing (alertA)
      // --------------------------
      response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);

      // Wait for the event log execute doc so we can get the execution UUID
      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 3 }]]));
      executeEvent = events[2];
      executionUuid = executeEvent?.kibana?.alert?.rule?.execution?.uuid;
      expect(executionUuid).not.to.be(undefined);

      // Query for alerts by execution UUID
      const alertDocsRun3 = await queryForAlertDocs<PatternFiringAlert>(executionUuid!);
      console.log(`alertDocsRun3 ${JSON.stringify(alertDocsRun3)}`);

      // After the third run, we should have 4 alert docs
      // The docs for "alertB" and "alertC" should not have been updated
      // There should be two docs for "alertA", one for the first active -> recovered span
      // the second for the new active span
      expect(alertDocsRun2.length).to.equal(4);

      testExpectRuleData(alertDocsRun3, ruleId, ruleParameters, executionUuid!);
    });
  });

  function testExpectRuleData(
    alertDocs: Array<SearchHit<PatternFiringAlert>>,
    ruleId: string,
    ruleParameters: unknown,
    executionUuid: string
  ) {
    for (let i = 0; i < alertDocs.length; ++i) {
      const source: PatternFiringAlert = alertDocs[i]._source!;

      // Each doc should have a copy of the rule data
      expect(source['kibana.alert.rule.category']).to.equal('Test: Firing on a Pattern');
      expect(source['kibana.alert.rule.consumer']).to.equal('alertsFixture');
      expect(source['kibana.alert.rule.execution.uuid']).to.equal(executionUuid);
      expect(source['kibana.alert.rule.name']).to.equal('abc');
      expect(source['kibana.alert.rule.producer']).to.equal('alertsFixture');
      expect(source['kibana.alert.rule.tags']).to.eql(['foo']);
      expect(source['kibana.alert.rule.rule_type_id']).to.equal('test.patternFiring');
      expect(source['kibana.alert.rule.uuid']).to.equal(ruleId);
      expect(source['kibana.alert.rule.parameters']).to.eql(ruleParameters);
      expect(source['kibana.space_ids']).to.eql(['space1']);
    }
  }

  async function queryForAlertDocs<T>(executionUuid: string): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index: '.alerts-test.patternfiring-default',
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  'kibana.alert.rule.execution.uuid': {
                    value: executionUuid,
                  },
                },
              },
            ],
          },
        },
      },
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
