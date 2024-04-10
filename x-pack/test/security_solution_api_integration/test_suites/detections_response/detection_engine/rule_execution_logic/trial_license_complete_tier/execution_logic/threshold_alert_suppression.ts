/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from 'expect';

import {
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_TERMS,
  ALERT_LAST_DETECTED,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

import { DETECTION_ENGINE_SIGNALS_STATUS_URL as DETECTION_ENGINE_ALERTS_STATUS_URL } from '@kbn/security-solution-plugin/common/constants';

import { ThresholdRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { RuleExecutionStatusEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';

import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { createRule } from '../../../../../../../common/utils/security_solution';
import {
  getAlerts,
  getPreviewAlerts,
  getThresholdRuleForAlertTesting,
  previewRule,
  patchRule,
  setAlertStatus,
  dataGeneratorFactory,
} from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless Threshold type rules, alert suppression', () => {
    const { indexListOfDocuments, indexGeneratedDocuments } = dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
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

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name'],
          value: 2,
        },
        alert_suppression: {
          duration: {
            value: 300,
            unit: 'm',
          },
        },
        from: 'now-35m',
        interval: '30m',
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getAlerts(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).toEqual(1);

      // suppression start equal to alert timestamp
      const suppressionStart = alerts.hits.hits[0]._source?.[TIMESTAMP];

      expect(alerts.hits.hits[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          // suppression boundaries equals to document timestamp, since both documents has same timestamp
          [ALERT_SUPPRESSION_START]: firstTimestamp,
          [ALERT_SUPPRESSION_END]: firstTimestamp,
          [ALERT_ORIGINAL_TIME]: firstTimestamp,
          [TIMESTAMP]: suppressionStart,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );

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
      const secondAlerts = await getAlerts(
        supertest,
        log,
        es,
        createdRule,
        RuleExecutionStatusEnum.succeeded,
        undefined,
        afterTimestamp
      );
      expect(secondAlerts.hits.hits.length).toEqual(1);
      expect(secondAlerts.hits.hits[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: firstTimestamp, // timestamp is the same
          [ALERT_SUPPRESSION_START]: firstTimestamp, // suppression start is the same
          [ALERT_SUPPRESSION_END]: secondTimestamp, // suppression end is updated by timestamp of the document suppressed in the second run
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        })
      );
    });

    it('should NOT suppress and update an alert if the alert is closed', async () => {
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

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name'],
          value: 2,
        },
        alert_suppression: {
          duration: {
            value: 300,
            unit: 'm',
          },
        },
        from: 'now-35m',
        interval: '30m',
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getAlerts(supertest, log, es, createdRule);

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
      const secondAlerts = await getAlerts(
        supertest,
        log,
        es,
        createdRule,
        RuleExecutionStatusEnum.succeeded,
        undefined,
        afterTimestamp
      );
      expect(secondAlerts.hits.hits.length).toEqual(2);
      expect(alerts.hits.hits[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: firstTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );
      expect(secondAlerts.hits.hits[1]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [ALERT_ORIGINAL_TIME]: secondTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );
    });

    it('should generate an alert per rule run when duration is less than rule interval', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const firstRunDoc = {
        id,
        '@timestamp': timestamp,
        agent: {
          name: 'agent-1',
        },
      };
      const secondRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };

      await indexListOfDocuments([
        firstRunDoc,
        firstRunDoc,
        firstRunDoc,
        secondRunDoc,
        secondRunDoc,
      ]);

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name'],
          value: 2,
        },
        alert_suppression: {
          duration: {
            value: 20,
            unit: 'm',
          },
        },
        from: 'now-35m',
        interval: '30m',
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
      expect(previewAlerts.length).toBe(2);
      expect(previewAlerts[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:45:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T05:45:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );

      expect(previewAlerts[1]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
          ],
          [TIMESTAMP]: '2020-10-28T06:30:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:15:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:15:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );
    });

    it('should update an existing alert in the time window that covers 2 rule executions', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const firstRunDoc = {
        id,
        '@timestamp': timestamp,
        agent: {
          name: 'agent-1',
        },
      };
      const secondRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };

      await indexListOfDocuments([
        firstRunDoc,
        firstRunDoc,
        firstRunDoc,
        secondRunDoc,
        secondRunDoc,
      ]);

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name'],
          value: 1,
        },
        alert_suppression: {
          duration: {
            value: 2,
            unit: 'h',
          },
        },
        from: 'now-35m',
        interval: '30m',
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
      expect(previewAlerts.length).toBe(1);
      expect(previewAlerts[0]._source).toEqual({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: 'agent-1',
          },
        ],
        [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
        [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: timestamp,
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:15:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
      });
    });

    it('should update an existing alert in the time window that covers 3 rule executions', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const firstRunDoc = {
        id,
        '@timestamp': timestamp,
        agent: {
          name: 'agent-1',
        },
      };
      const secondRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };
      const thirdRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:45:00.000Z',
      };

      await indexListOfDocuments([
        firstRunDoc,
        firstRunDoc,
        firstRunDoc,
        secondRunDoc,
        secondRunDoc,
        thirdRunDoc,
      ]);

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name'],
          value: 1,
        },
        alert_suppression: {
          duration: {
            value: 2,
            unit: 'h',
          },
        },
        from: 'now-35m',
        interval: '30m',
      };

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T07:00:00.000Z'),
        invocationCount: 3,
      });
      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        sort: [ALERT_ORIGINAL_TIME],
      });
      expect(previewAlerts.length).toEqual(1);
      expect(previewAlerts[0]._source).toEqual({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: 'agent-1',
          },
        ],
        [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
        [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: timestamp,
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:45:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
      });
    });

    // needed to ensure threshold history works correctly for suppressed alerts
    // history should be updated from events in suppressed alerts, not existing alert
    // so subsequent rule runs won't trigger false positives
    it('should not generate false positives suppressed alerts when threshold history is present', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const firstRunDoc = {
        id,
        '@timestamp': timestamp,
        agent: {
          name: 'agent-1',
        },
      };
      const secondRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };

      await indexListOfDocuments([
        firstRunDoc,
        firstRunDoc,
        firstRunDoc,
        secondRunDoc,
        secondRunDoc,
      ]);

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name'],
          value: 2,
        },
        alert_suppression: {
          duration: {
            value: 2,
            unit: 'h',
          },
        },
        from: 'now-60m',
        interval: '30m',
      };

      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T07:00:00.000Z'),
        invocationCount: 3,
      });
      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        sort: [ALERT_ORIGINAL_TIME],
      });
      expect(previewAlerts.length).toEqual(1);
      expect(previewAlerts[0]._source).toEqual({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: 'agent-1',
          },
        ],
        [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
        [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: timestamp,
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:15:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 1, // only one suppressed alert as expected
      });
    });

    it('should update the correct alerts based on multi values threshold.field', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const firstRunDocA = {
        id,
        '@timestamp': timestamp,
        agent: {
          name: 'agent-1',
          type: 'auditbeat',
        },
      };
      const firstRunDocF = {
        ...firstRunDocA,
        agent: {
          name: 'agent-1',
          type: 'filebeat',
        },
      };
      const firstRunDocAgent2 = {
        ...firstRunDocA,
        agent: {
          name: 'agent-2',
          type: 'auditbeat',
        },
      };

      const secondRunDocA = {
        ...firstRunDocA,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };

      await indexListOfDocuments([
        firstRunDocA,
        firstRunDocA,
        firstRunDocF,
        firstRunDocF,
        firstRunDocAgent2,
        secondRunDocA,
        secondRunDocA,
        secondRunDocA,
      ]);

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name', 'agent.type'],
          value: 2,
        },
        alert_suppression: {
          duration: {
            value: 2,
            unit: 'h',
          },
        },
        from: 'now-35m',
        interval: '30m',
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
        sort: ['agent.type', ALERT_ORIGINAL_TIME],
      });
      // 2 alert should be generated:
      // 1. for pair 'agent-1', 'auditbeat' - suppressed
      // 2. for pair 'agent-1', 'filebeat' - not suppressed
      expect(previewAlerts.length).toEqual(2);
      expect(previewAlerts[0]._source).toEqual({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: 'agent-1',
          },
          {
            field: 'agent.type',
            value: 'auditbeat',
          },
        ],
        [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
        [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: timestamp,
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:15:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
      });
      expect(previewAlerts[1]._source).toEqual({
        ...previewAlerts[1]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: 'agent-1',
          },
          {
            field: 'agent.type',
            value: 'filebeat',
          },
        ],
        [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
        [ALERT_LAST_DETECTED]: '2020-10-28T06:00:00.000Z',
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: timestamp,
        [ALERT_SUPPRESSION_END]: timestamp,
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0, // no suppressed alerts
      });
    });

    // should work correctly if one of the suppressed fields is keyword, another - number
    it('should update an existing alert in the time window with multiple fields of different types', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const firstRunDoc = {
        id,
        '@timestamp': timestamp,
        agent: {
          name: 'agent-1',
        },
        host: {
          uptime: 100,
        },
      };

      const secondRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };

      await indexListOfDocuments([firstRunDoc, firstRunDoc, secondRunDoc, secondRunDoc]);

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name', 'host.uptime'],
          value: 2,
        },
        alert_suppression: {
          duration: {
            value: 2,
            unit: 'h',
          },
        },
        from: 'now-35m',
        interval: '30m',
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
        sort: ['agent.type', ALERT_ORIGINAL_TIME],
      });

      expect(previewAlerts.length).toEqual(1);

      expect(previewAlerts[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-1',
            },
            {
              field: 'host.uptime',
              value: 100,
            },
          ],
          [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z',
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_START]: timestamp,
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:15:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        })
      );
    });

    it('should correctly suppress when using a timestamp override', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
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

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name'],
          value: 1,
        },
        alert_suppression: {
          duration: {
            value: 300,
            unit: 'm',
          },
        },
        from: 'now-35m',
        interval: '30m',
        timestamp_override: 'event.ingested',
      };
      // 1 alert should be suppressed, based on event.ingested value of a document
      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
        invocationCount: 2,
      });
      const previewAlerts = await getPreviewAlerts({
        es,
        previewId,
        sort: ['agent.name', ALERT_ORIGINAL_TIME],
      });
      expect(previewAlerts.length).toEqual(1);
      expect(previewAlerts[0]._source).toEqual({
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
      const timestamp = '2020-10-28T05:45:00.000Z';
      const laterTimestamp = '2020-10-28T06:10:00.000Z';

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

      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['ecs_compliant']),
        query: `id:${id}`,
        threshold: {
          field: ['agent.name'],
          value: 1,
        },
        alert_suppression: {
          duration: {
            value: 300,
            unit: 'm',
          },
        },
        from: 'now-35m',
        interval: '30m',
        max_signals: 150,
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
        sort: ['agent.name', ALERT_ORIGINAL_TIME],
      });
      expect(previewAlerts.length).toEqual(150);
      expect(previewAlerts[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: 'agent-0',
            },
          ],
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        })
      );
    });
  });
};
