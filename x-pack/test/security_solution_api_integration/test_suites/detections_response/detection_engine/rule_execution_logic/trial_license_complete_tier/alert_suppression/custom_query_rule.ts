/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ALERT_WORKFLOW_STATUS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_TERMS,
  TIMESTAMP,
  ALERT_LAST_DETECTED,
} from '@kbn/rule-data-utils';
import { v4 as uuidv4 } from 'uuid';

import {
  QueryRuleCreateProps,
  AlertSuppressionMissingFieldsStrategyEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { RuleExecutionStatusEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL as DETECTION_ENGINE_ALERTS_STATUS_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  getOpenAlerts,
  getPreviewAlerts,
  previewRule,
  setAlertStatus,
  patchRule,
  dataGeneratorFactory,
} from '../../../../utils';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
} from '../../../../../../../common/utils/security_solution';

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('@ess @serverless Custom query rule with alert suppression', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/suppression');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/suppression');
    });

    afterEach(async () => {
      await esDeleteAllIndices('.preview.alerts*');
      await deleteAllAlerts(supertest, log, es, ['.preview.alerts-security.alerts-*']);
      await deleteAllRules(supertest, log);
    });

    it('should generate only 1 alert per host name when grouping by host name', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['suppression-data']),
        query: `host.name: "host-0"`,
        alert_suppression: {
          group_by: ['host.name'],
        },
        from: 'now-1h',
        interval: '1h',
      };

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T05:30:00.000Z'),
      });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).to.eql(1);
      expect(previewAlerts[0]._source).to.eql({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'host.name',
            value: 'host-0',
          },
        ],
        [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 5,
      });
    });

    it('should generate multiple alerts when multiple host names are found', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['suppression-data']),
        query: `host.name: *`,
        alert_suppression: {
          group_by: ['host.name'],
        },
        from: 'now-1h',
        interval: '1h',
      };

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T05:30:00.000Z'),
      });
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 1000 });
      expect(previewAlerts.length).to.eql(3);

      previewAlerts.sort((a, b) =>
        (a._source?.host?.name ?? '0') > (b._source?.host?.name ?? '0') ? 1 : -1
      );

      const hostNames = previewAlerts.map((alert) => alert._source?.host?.name);
      expect(hostNames).to.eql(['host-0', 'host-1', 'host-2']);
      expect(previewAlerts[0]._source).to.eql({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'host.name',
            value: 'host-0',
          },
        ],
        [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 5,
      });
    });

    it('should generate alerts when using multiple group by fields', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['suppression-data']),
        query: `host.name: *`,
        alert_suppression: {
          group_by: ['host.name', 'source.ip'],
        },
        from: 'now-1h',
        interval: '1h',
      };

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T05:30:00.000Z'),
      });
      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        size: 1000,
        sort: ['host.name', 'source.ip'],
      });
      expect(previewAlerts.length).to.eql(6);

      expect(previewAlerts[0]._source).to.eql({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'host.name',
            value: 'host-0',
          },
          {
            field: 'source.ip',
            value: '192.168.1.1',
          },
        ],
        [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
      });
    });

    it('should not count documents that were covered by previous alerts', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['suppression-data']),
        query: `host.name: *`,
        alert_suppression: {
          group_by: ['host.name', 'source.ip'],
        },
        // The first invocation covers half of the source docs, the second invocation covers all documents.
        // We will check and make sure the second invocation correctly filters out the first half that
        // were alerted on by the first invocation.
        from: 'now-2h',
        interval: '1h',
      };

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        invocationCount: 2,
      });
      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        size: 1000,
        sort: ['host.name', 'source.ip', ALERT_ORIGINAL_TIME],
      });
      expect(previewAlerts.length).to.eql(12);

      expect(previewAlerts[0]._source).to.eql({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'host.name',
            value: 'host-0',
          },
          {
            field: 'source.ip',
            value: '192.168.1.1',
          },
        ],
        [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
      });

      expect(previewAlerts[1]._source).to.eql({
        ...previewAlerts[1]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'host.name',
            value: 'host-0',
          },
          {
            field: 'source.ip',
            value: '192.168.1.1',
          },
        ],
        // Note: the timestamps here are 1 hour after the timestamps for previewAlerts[0]
        [ALERT_ORIGINAL_TIME]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
      });
    });

    // Only one source document populates destination.ip, but it populates the field with an array
    // so we expect 2 groups to be created from the single document
    it('should generate multiple alerts for a single doc in multiple groups', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['suppression-data']),
        query: `*:*`,
        alert_suppression: {
          group_by: ['destination.ip'],
        },
        from: 'now-1h',
        interval: '1h',
      };

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T05:30:00.000Z'),
      });
      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        size: 1000,
        sort: ['destination.ip'],
      });
      expect(previewAlerts.length).to.eql(3);

      expect(previewAlerts[0]._source).to.eql({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'destination.ip',
            value: '127.0.0.1',
          },
        ],
        [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
      });

      // We also expect to have a separate group for documents that don't populate the groupBy field
      expect(previewAlerts[2]._source).to.eql({
        ...previewAlerts[2]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'destination.ip',
            value: null,
          },
        ],
        [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 16,
      });
    });

    it('should correctly deduplicate null values across rule runs', async () => {
      // We set a long lookback then run the rule twice so both runs cover all documents from the test data.
      // The last alert, with null for destination.ip, should be found by the first rule run but not duplicated
      // by the second run.
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['suppression-data']),
        query: `*:*`,
        alert_suppression: {
          group_by: ['destination.ip'],
        },
        from: 'now-2h',
        interval: '1h',
      };

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T07:30:00.000Z'),
        invocationCount: 2,
      });
      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        size: 1000,
        sort: ['destination.ip'],
      });
      expect(previewAlerts.length).to.eql(3);

      // We also expect to have a separate group for documents that don't populate the groupBy field
      expect(previewAlerts[2]._source).to.eql({
        ...previewAlerts[2]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'destination.ip',
            value: null,
          },
        ],
        [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 34,
      });
    });

    describe('with a suppression time window', async () => {
      const { indexListOfDocuments, indexGeneratedDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
        );
      });

      it('should update an alert using real rule executions', async () => {
        const id = uuidv4();
        const firstTimestamp = new Date().toISOString();
        const firstDocument = {
          id,
          '@timestamp': firstTimestamp,
          agent: {
            name: 'agent-1',
          },
        };
        await indexListOfDocuments([firstDocument, firstDocument]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          rule_id: 'rule-2',
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            duration: {
              value: 300,
              unit: 'm',
            },
          },
        };
        const createdRule = await createRule(supertest, log, rule);
        const alerts = await getOpenAlerts(supertest, log, es, createdRule);
        expect(alerts.hits.hits.length).eql(1);
        expect(alerts.hits.hits[0]._source).to.eql({
          ...alerts.hits.hits[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: firstTimestamp,
          [ALERT_SUPPRESSION_START]: firstTimestamp,
          [ALERT_SUPPRESSION_END]: firstTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });

        const secondTimestamp = new Date().toISOString();
        const secondDocument = {
          id,
          '@timestamp': secondTimestamp,
          agent: {
            name: 'agent-1',
          },
        };
        // Add a new document, then disable and re-enable to trigger another rule run. The second doc should
        // trigger an update to the existing alert without changing the timestamp
        await indexListOfDocuments([secondDocument, secondDocument]);
        await patchRule(supertest, log, { id: createdRule.id, enabled: false });
        await patchRule(supertest, log, { id: createdRule.id, enabled: true });
        const afterTimestamp = new Date();
        const secondAlerts = await getOpenAlerts(
          supertest,
          log,
          es,
          createdRule,
          RuleExecutionStatusEnum.succeeded,
          undefined,
          afterTimestamp
        );
        expect(secondAlerts.hits.hits.length).eql(1);
        expect(secondAlerts.hits.hits[0]._source).to.eql({
          ...secondAlerts.hits.hits[0]._source,
          [TIMESTAMP]: secondAlerts.hits.hits[0]._source?.[TIMESTAMP],
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: firstTimestamp,
          [ALERT_SUPPRESSION_START]: firstTimestamp,
          [ALERT_SUPPRESSION_END]: secondTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 3,
        });
      });

      it('should NOT update an alert if the alert is closed', async () => {
        const id = uuidv4();
        const firstTimestamp = new Date().toISOString();
        const firstDocument = {
          id,
          '@timestamp': firstTimestamp,
          agent: {
            name: 'agent-1',
          },
        };
        await indexListOfDocuments([firstDocument, firstDocument]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          rule_id: 'rule-2',
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            duration: {
              value: 300,
              unit: 'm',
            },
          },
        };
        const createdRule = await createRule(supertest, log, rule);
        const alerts = await getOpenAlerts(supertest, log, es, createdRule);

        // Close the alert. Subsequent rule executions should ignore this closed alert
        // for suppression purposes.
        const alertIds = alerts.hits.hits.map((alert) => alert._id);
        await supertest
          .post(DETECTION_ENGINE_ALERTS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertStatus({ alertIds, status: 'closed' }))
          .expect(200);

        const secondTimestamp = new Date().toISOString();
        const secondDocument = {
          id,
          '@timestamp': secondTimestamp,
          agent: {
            name: 'agent-1',
          },
        };
        // Add new documents, then disable and re-enable to trigger another rule run. The second doc should
        // trigger a new alert since the first one is now closed.
        await indexListOfDocuments([secondDocument, secondDocument]);
        await patchRule(supertest, log, { id: createdRule.id, enabled: false });
        await patchRule(supertest, log, { id: createdRule.id, enabled: true });
        const afterTimestamp = new Date();
        const secondAlerts = await getOpenAlerts(
          supertest,
          log,
          es,
          createdRule,
          RuleExecutionStatusEnum.succeeded,
          undefined,
          afterTimestamp
        );
        expect(secondAlerts.hits.hits.length).eql(2);
        expect(secondAlerts.hits.hits[0]._source).to.eql({
          ...secondAlerts.hits.hits[0]._source,
          [TIMESTAMP]: secondAlerts.hits.hits[0]._source?.[TIMESTAMP],
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_WORKFLOW_STATUS]: 'closed',
          [ALERT_ORIGINAL_TIME]: firstTimestamp,
          [ALERT_SUPPRESSION_START]: firstTimestamp,
          [ALERT_SUPPRESSION_END]: firstTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
        expect(secondAlerts.hits.hits[1]._source).to.eql({
          ...secondAlerts.hits.hits[1]._source,
          [TIMESTAMP]: secondAlerts.hits.hits[1]._source?.[TIMESTAMP],
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_WORKFLOW_STATUS]: 'open',
          [ALERT_ORIGINAL_TIME]: secondTimestamp,
          [ALERT_SUPPRESSION_START]: secondTimestamp,
          [ALERT_SUPPRESSION_END]: secondTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
      });

      it('should generate an alert per rule run when duration is less than rule interval', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `host.name: "host-0"`,
          alert_suppression: {
            group_by: ['host.name'],
            duration: {
              value: 30,
              unit: 'm',
            },
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: [ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).to.eql(2);
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
          ],
          [TIMESTAMP]: '2020-10-28T05:30:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T05:30:00.000Z',
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 5,
        });
        expect(previewAlerts[1]._source).to.eql({
          ...previewAlerts[1]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
          ],
          [TIMESTAMP]: '2020-10-28T06:30:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z',
          [ALERT_ORIGINAL_TIME]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 5,
        });
      });

      it('should update an existing alert in the time window', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `host.name: "host-0"`,
          alert_suppression: {
            group_by: ['host.name'],
            duration: {
              value: 2,
              unit: 'h',
            },
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: [ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).to.eql(1);
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
          ],
          [TIMESTAMP]: '2020-10-28T05:30:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 11,
        });
      });

      it('should update the correct alerts based on group_by field-value pair', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `host.name: *`,
          alert_suppression: {
            group_by: ['host.name'],
            duration: {
              value: 2,
              unit: 'h',
            },
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: ['host.name', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).to.eql(3);
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-0',
            },
          ],
          [TIMESTAMP]: '2020-10-28T05:30:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z',
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 11,
        });
        expect(previewAlerts[1]._source).to.eql({
          ...previewAlerts[1]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-1',
            },
          ],
          [TIMESTAMP]: '2020-10-28T05:30:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z',
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 11,
        });
        expect(previewAlerts[2]._source).to.eql({
          ...previewAlerts[2]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-2',
            },
          ],
          [TIMESTAMP]: '2020-10-28T05:30:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z',
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 11,
        });
      });

      it('should update the correct alerts based on group_by field-value pair even when value is null', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['suppression-data']),
          query: `host.name: *`,
          alert_suppression: {
            group_by: ['destination.ip'], // Only 1 document populates destination.ip
            duration: {
              value: 2,
              unit: 'h',
            },
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: ['destination.ip', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).to.eql(3);
        expect(previewAlerts[2]._source).to.eql({
          ...previewAlerts[2]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'destination.ip',
              value: null,
            },
          ],
          [TIMESTAMP]: '2020-10-28T05:30:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z',
          [ALERT_ORIGINAL_TIME]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 34,
        });
      });

      it('should correctly deduplicate when using a timestamp override', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        const docWithoutOverride = {
          id,
          '@timestamp': timestamp,
          agent: {
            name: 'agent-1',
          },
        };
        const docWithOverride = {
          ...docWithoutOverride,
          // This doc simulates a very late arriving doc
          '@timestamp': '2020-10-28T03:00:00.000Z',
          event: {
            ingested: '2020-10-28T06:10:00.000Z',
          },
        };
        await indexListOfDocuments([docWithoutOverride, docWithOverride]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            duration: {
              value: 300,
              unit: 'm',
            },
          },
          from: 'now-2h',
          interval: '1h',
          timestamp_override: 'event.ingested',
        };

        // Here we want to check that (1) the suppression end time is set correctly based on the override,
        // and (2) despite the large lookback, the docs are not counted again in the second invocation
        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T07:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: ['agent.name', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).to.eql(1);
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_START]: timestamp,
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:10:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
      });

      it('should generate and update up to max_signals alerts', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        const laterTimestamp = '2020-10-28T07:00:00.000Z';

        await Promise.all(
          [timestamp, laterTimestamp].map((t) =>
            indexGeneratedDocuments({
              docsCount: 150,
              seed: (index) => ({
                id,
                '@timestamp': t,
                agent: {
                  name: `agent-${index}`,
                },
              }),
            })
          )
        );

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            duration: {
              value: 300,
              unit: 'm',
            },
          },
          from: 'now-1h',
          interval: '1h',
          timestamp_override: 'event.ingested',
          max_signals: 150,
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T07:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 1000,
          sort: ['agent.name', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).to.eql(150);
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-0',
            },
          ],
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_START]: timestamp,
          [ALERT_SUPPRESSION_END]: laterTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
        expect(previewAlerts[149]._source).to.eql({
          ...previewAlerts[149]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              // Values are sorted with string comparison, so 'agent-99' is last (not 'agent-149')
              value: 'agent-99',
            },
          ],
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_START]: timestamp,
          [ALERT_SUPPRESSION_END]: laterTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
      });

      it('should create and update alerts in the same rule run without errors', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        // agent-1 should create an alert on the first rule run, then the second rule run should update that
        // alert and make a new alert for agent-2
        const firstDoc = {
          id,
          '@timestamp': timestamp,
          agent: {
            name: 'agent-1',
          },
        };
        const laterTimestamp = '2020-10-28T07:00:00.000Z';
        const secondDoc = {
          id,
          '@timestamp': laterTimestamp,
          agent: {
            name: 'agent-1',
          },
        };
        const thirdDoc = {
          id,
          '@timestamp': laterTimestamp,
          agent: {
            name: 'agent-2',
          },
        };
        await indexListOfDocuments([firstDoc, secondDoc, thirdDoc]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            duration: {
              value: 300,
              unit: 'm',
            },
          },
          from: 'now-1h',
          interval: '1h',
          timestamp_override: 'event.ingested',
          max_signals: 150,
        };

        const { previewId, logs } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T07:30:00.000Z'),
          invocationCount: 2,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).to.eql(2);
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_START]: timestamp,
          [ALERT_SUPPRESSION_END]: laterTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
        expect(previewAlerts[1]._source).to.eql({
          ...previewAlerts[1]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-2',
            },
          ],
          [ALERT_ORIGINAL_TIME]: laterTimestamp,
          [ALERT_SUPPRESSION_START]: laterTimestamp,
          [ALERT_SUPPRESSION_END]: laterTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        });
        for (const logEntry of logs) {
          expect(logEntry.errors.length).to.eql(0);
        }
      });

      describe('with host risk index', async () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/entity/host_risk');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/entity/host_risk');
        });

        it('should be enriched with host risk score', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['suppression-data']),
            query: `host.name: "host-0"`,
            alert_suppression: {
              group_by: ['host.name'],
              duration: {
                value: 30,
                unit: 'm',
              },
            },
            from: 'now-1h',
            interval: '1h',
          };

          const { previewId } = await previewRule({
            supertest,
            rule,
            timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
            invocationCount: 1,
          });
          const previewAlerts = await getPreviewAlerts({
            es,
            previewId,
            sort: [ALERT_ORIGINAL_TIME],
          });
          expect(previewAlerts.length).to.eql(1);
          expect(previewAlerts[0]._source).to.eql({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: 'host-0',
              },
            ],
            [TIMESTAMP]: '2020-10-28T06:30:00.000Z',
            [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z',
            [ALERT_ORIGINAL_TIME]: '2020-10-28T06:00:00.000Z',
            [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
            [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:02.000Z',
            [ALERT_SUPPRESSION_DOCS_COUNT]: 5,
          });
          expect(previewAlerts[0]._source?.host?.risk?.calculated_level).to.eql('Low');
          expect(previewAlerts[0]._source?.host?.risk?.calculated_score_norm).to.eql(1);
        });
      });
    });

    // when missing_fields_strategy set to "doNotSuppress", each document with missing grouped by field
    // will generate a separate alert
    describe('unsuppressed alerts', () => {
      const { indexListOfDocuments, indexGeneratedDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
        );
      });

      it('should create unsuppressed alerts for single host.name field when some of the documents have missing values', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        const firstDoc = {
          id,
          '@timestamp': timestamp,
          agent: {
            name: 'agent-1',
          },
        };
        const missingFieldDoc = {
          id,
          '@timestamp': timestamp,
        };

        await indexListOfDocuments([
          firstDoc,
          firstDoc,
          missingFieldDoc,
          missingFieldDoc,
          missingFieldDoc,
        ]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name'],
        });
        expect(previewAlerts.length).to.eql(4);
        // first alert should be suppressed
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_SUPPRESSION_START]: timestamp,
          [ALERT_SUPPRESSION_END]: timestamp,
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });

        // alert is not suppressed and do not have suppress properties
        expect(previewAlerts[1]._source).to.have.property('id', id);
        expect(previewAlerts[1]._source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
        expect(previewAlerts[1]._source).not.to.have.property(ALERT_SUPPRESSION_END);
        expect(previewAlerts[1]._source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
        expect(previewAlerts[1]._source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);

        // rest of alerts are not suppressed and do not have suppress properties
        previewAlerts.slice(2).forEach((previewAlert) => {
          const source = previewAlert._source;
          expect(source).to.have.property('id', id);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_END);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
        });
      });

      it('should create unsuppressed alerts for single host.name field when all the documents have missing values', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        const missingFieldDoc = {
          id,
          '@timestamp': timestamp,
        };

        await indexListOfDocuments([
          missingFieldDoc,
          missingFieldDoc,
          missingFieldDoc,
          missingFieldDoc,
        ]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name'],
        });
        expect(previewAlerts.length).to.eql(4);

        // alert is not suppressed and do not have suppress properties
        expect(previewAlerts[1]._source).to.have.property('id', id);
        expect(previewAlerts[1]._source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
        expect(previewAlerts[1]._source).not.to.have.property(ALERT_SUPPRESSION_END);
        expect(previewAlerts[1]._source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
        expect(previewAlerts[1]._source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);

        // rest of alerts are not suppressed and do not have suppress properties
        previewAlerts.slice(2).forEach((previewAlert) => {
          const source = previewAlert._source;
          expect(source).to.have.property('id', id);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_END);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
        });
      });

      it('should not create unsuppressed alerts if documents are not missing fields', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        const firstDoc = {
          id,
          '@timestamp': timestamp,
          agent: {
            name: 'agent-1',
          },
        };

        await indexListOfDocuments([firstDoc, firstDoc]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name'],
        });
        expect(previewAlerts.length).to.eql(1);
        // first alert should be suppressed
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_SUPPRESSION_START]: timestamp,
          [ALERT_SUPPRESSION_END]: timestamp,
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
      });

      it('should create no more than max_signals unsuppressed alerts', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        const firstDoc = { id, '@timestamp': timestamp, agent: { name: 'agent-0' } };

        await indexGeneratedDocuments({
          docsCount: 150,
          seed: () => ({
            id,
            '@timestamp': timestamp,
          }),
        });

        await indexListOfDocuments([firstDoc, firstDoc]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
          },
          from: 'now-1h',
          interval: '1h',
          max_signals: 100,
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 200,
          sort: ['agent.name'],
        });
        // alerts number should be still at 100
        expect(previewAlerts.length).to.eql(100);
        // first alert should be suppressed
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-0',
            },
          ],
          [ALERT_SUPPRESSION_START]: timestamp,
          [ALERT_SUPPRESSION_END]: timestamp,
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });

        // rest of alerts are not suppressed and do not have suppress properties
        previewAlerts.slice(1).forEach((previewAlert) => {
          const source = previewAlert._source;
          expect(source).to.have.property('id', id);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_END);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
        });
      });

      it('should create unsuppressed alerts for multiple fields when ony some of the documents have missing values', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        const firstDoc = {
          id,
          '@timestamp': timestamp,
          agent: { name: 'agent-0', version: 'filebeat' },
        };
        const secondDoc = {
          id,
          '@timestamp': timestamp,
          agent: { name: 'agent-0', version: 'auditbeat' },
        };
        const thirdDoc = {
          id,
          '@timestamp': timestamp,
          agent: { name: 'agent-1', version: 'filebeat' },
        };
        const missingFieldDoc1 = {
          id,
          '@timestamp': timestamp,
          agent: { name: 'agent-2' },
        };
        const missingFieldDoc2 = {
          id,
          '@timestamp': timestamp,
          agent: { version: 'filebeat' },
        };
        const missingAllFieldsDoc = {
          id,
          '@timestamp': timestamp,
        };

        await indexListOfDocuments([
          firstDoc,
          secondDoc,
          secondDoc,
          thirdDoc,
          thirdDoc,
          thirdDoc,
          missingFieldDoc1,
          missingFieldDoc2,
          missingFieldDoc2,
          missingAllFieldsDoc,
          missingAllFieldsDoc,
        ]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name', 'agent.version'],
            missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name', 'agent.version'],
        });
        // total 8 alerts = 3 suppressed alerts + 5 unsuppressed (from docs with at least one missing field)
        expect(previewAlerts.length).to.eql(8);
        // first 3 alerts should be suppressed
        expect(previewAlerts[0]._source).to.eql({
          ...previewAlerts[0]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            { field: 'agent.name', value: 'agent-0' },
            { field: 'agent.version', value: 'auditbeat' },
          ],
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });

        expect(previewAlerts[1]._source).to.eql({
          ...previewAlerts[1]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            { field: 'agent.name', value: 'agent-0' },
            { field: 'agent.version', value: 'filebeat' },
          ],
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        });

        expect(previewAlerts[2]._source).to.eql({
          ...previewAlerts[2]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            { field: 'agent.name', value: 'agent-1' },
            { field: 'agent.version', value: 'filebeat' },
          ],
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
        });

        // rest of alerts are not suppressed and do not have suppress properties
        previewAlerts.slice(3).forEach((previewAlert) => {
          const source = previewAlert._source;
          expect(source).to.have.property('id', id);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_END);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
        });
      });

      it('should create unsuppressed alerts for multiple fields when all the documents have missing values', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';
        const missingFieldDoc1 = { id, '@timestamp': timestamp, agent: { name: 'agent-2' } };
        const missingFieldDoc2 = { id, '@timestamp': timestamp, agent: { version: 'filebeat' } };
        const missingAllFieldsDoc = { id, '@timestamp': timestamp };

        await indexListOfDocuments([
          missingFieldDoc1,
          missingFieldDoc2,
          missingFieldDoc2,
          missingAllFieldsDoc,
          missingAllFieldsDoc,
          missingAllFieldsDoc,
        ]);

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id}`,
          alert_suppression: {
            group_by: ['agent.name', 'agent.version'],
            missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
          },
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name', 'agent.version'],
        });
        // total 6 alerts = 6 unsuppressed (from docs with at least one missing field)
        expect(previewAlerts.length).to.eql(6);

        // all alerts are not suppressed and do not have suppress properties
        previewAlerts.forEach((previewAlert) => {
          const source = previewAlert._source;
          expect(source).to.have.property('id', id);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_END);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
          expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
        });
      });

      // following 2 tests created to show the difference in 2 modes, using the same data and using suppression time window
      // rule will be executing 2 times and will create alert during both executions, that will be suppressed according to time window
      describe('with a suppression time window', async () => {
        let id: string;
        const timestamp = '2020-10-28T06:00:00.000Z';
        const laterTimestamp = '2020-10-28T07:00:00.000Z';
        beforeEach(async () => {
          id = uuidv4();
          // we have 3 kind of documents here:
          // 1. agent.name: 2 docs with agent-1 in both rule runs
          // 2. agent.name: 2 docs with agent-2 in second rule run only
          // 3. agent.name: 3 docs with undefined in both rule runs
          // if suppress on missing = true - we'll get 3 suppressed alerts
          // if suppress on missing = false - we'll get 2 suppressed alerts and 3 unsuppressed for missing agent.name
          const firstDoc = { id, '@timestamp': timestamp, agent: { name: 'agent-1' } };
          const secondDoc = { id, '@timestamp': laterTimestamp, agent: { name: 'agent-1' } };
          const thirdDoc = { id, '@timestamp': laterTimestamp, agent: { name: 'agent-2' } };
          const missingFieldDoc1 = { id, '@timestamp': timestamp };
          const missingFieldDoc2 = { id, '@timestamp': laterTimestamp };

          await indexListOfDocuments([
            firstDoc,
            secondDoc,
            thirdDoc,
            thirdDoc,
            missingFieldDoc1,
            missingFieldDoc1,
            missingFieldDoc2,
          ]);
        });
        it('should create suppressed alerts for single host.name when rule configure with suppress', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['ecs_compliant']),
            query: `id:${id}`,
            alert_suppression: {
              group_by: ['agent.name'],
              duration: {
                value: 300,
                unit: 'm',
              },
              missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
            },
            from: 'now-1h',
            interval: '1h',
            timestamp_override: 'event.ingested',
          };
          // checking first default suppress mode
          const { previewId, logs } = await previewRule({
            supertest,
            rule,
            timeframeEnd: new Date('2020-10-28T07:30:00.000Z'),
            invocationCount: 2,
          });
          const previewAlerts = await getPreviewAlerts({
            es,
            previewId,
            size: 10,
            sort: ['agent.name', ALERT_ORIGINAL_TIME],
          });
          expect(previewAlerts.length).to.eql(3);

          expect(previewAlerts[0]._source).to.eql({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: 'agent-1',
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });
          expect(previewAlerts[1]._source).to.eql({
            ...previewAlerts[1]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: 'agent-2',
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });
          expect(previewAlerts[2]._source).to.eql({
            ...previewAlerts[2]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: null,
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          });

          for (const logEntry of logs) {
            expect(logEntry.errors.length).to.eql(0);
          }
        });

        it('should create unsuppressed alerts for single host.name', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['ecs_compliant']),
            query: `id:${id}`,
            alert_suppression: {
              group_by: ['agent.name'],
              duration: {
                value: 300,
                unit: 'm',
              },
              missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
            },
            from: 'now-1h',
            interval: '1h',
            timestamp_override: 'event.ingested',
          };
          const { previewId, logs } = await previewRule({
            supertest,
            rule,
            timeframeEnd: new Date('2020-10-28T07:30:00.000Z'),
            invocationCount: 2,
          });
          const previewAlerts = await getPreviewAlerts({
            es,
            previewId,
            size: 10,
            sort: ['agent.name', ALERT_ORIGINAL_TIME],
          });
          expect(previewAlerts.length).to.eql(5);

          // first alerts expected to be suppressed
          expect(previewAlerts[0]._source).to.eql({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: 'agent-1',
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });
          expect(previewAlerts[1]._source).to.eql({
            ...previewAlerts[1]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: 'agent-2',
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });

          // third alert is not suppressed and do not have suppress properties
          expect(previewAlerts[2]._source).to.have.property('id', id);
          expect(previewAlerts[2]._source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
          expect(previewAlerts[2]._source).not.to.have.property(ALERT_SUPPRESSION_END);
          expect(previewAlerts[2]._source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
          expect(previewAlerts[2]._source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);

          // rest of alerts are not suppressed and do not have suppress properties
          previewAlerts.slice(3).forEach((previewAlert) => {
            const source = previewAlert._source;
            expect(source).to.have.property('id', id);
            expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
            expect(source).not.to.have.property(ALERT_SUPPRESSION_END);
            expect(source).not.to.have.property(ALERT_SUPPRESSION_TERMS);
            expect(source).not.to.have.property(ALERT_SUPPRESSION_DOCS_COUNT);
          });

          for (const logEntry of logs) {
            expect(logEntry.errors.length).to.eql(0);
          }
        });
      });
    });
  });
};
