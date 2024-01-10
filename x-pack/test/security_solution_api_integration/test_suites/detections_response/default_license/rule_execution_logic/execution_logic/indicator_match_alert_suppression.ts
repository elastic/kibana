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

import { ThreatMatchRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { RuleExecutionStatusEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';

import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';
import {
  createRule,
  getOpenAlerts,
  getPreviewAlerts,
  getThreatMatchRuleForAlertTesting,
  previewRule,
  patchRule,
  setAlertStatus,
  dataGeneratorFactory,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  // TODO: add a new service
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const threatIntelPath = dataPathBuilder.getPath('filebeat/threat_intel');
  const {
    indexListOfDocuments: indexListOfSourceDocuments,
    indexGeneratedDocuments: indexGeneratedSourceDocuments,
  } = dataGeneratorFactory({
    es,
    index: 'ecs_compliant',
    log,
  });

  // ensures minimal number of events indexed
  const eventsFiller = ({
    id,
    timestamp,
    count,
  }: {
    id: string;
    count: number;
    timestamp: string;
  }) =>
    indexGeneratedSourceDocuments({
      docsCount: count,
      seed: (index) => ({
        id,
        '@timestamp': timestamp,
        host: {
          name: `host-${index}`,
        },
      }),
    });

  const threatsFiller = async ({
    id,
    timestamp,
    count,
  }: {
    id: string;
    count: number;
    timestamp: string;
  }) =>
    count &&
    indexGeneratedSourceDocuments({
      docsCount: count,
      seed: (index) => ({
        id,
        '@timestamp': timestamp,
        'agent.type': 'threat',
      }),
    });

  const addThreatDocuments = ({
    id,
    timestamp,
    fields,
    count,
  }: {
    id: string;
    fields?: Record<string, unknown>;
    timestamp: string;
    count: number;
  }) =>
    indexGeneratedSourceDocuments({
      docsCount: count,
      seed: (index) => ({
        id,
        '@timestamp': timestamp,
        host: {
          name: `host-${index}`,
        },
        'agent.type': 'threat',
        ...fields,
      }),
    });

  const indicatorMatchRule = (id: string) => ({
    ...getThreatMatchRuleForAlertTesting(['ecs_compliant']),
    query: `id:${id} and NOT agent.type:threat`,
    threat_query: `id:${id} and agent.type:threat`,
    name: 'ALert suppression IM test rule',
  });

  describe.only('@ess @serverless Indicator match type rules, alert suppression', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      //   await esArchiver.load(threatIntelPath);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      //  await esArchiver.load(threatIntelPath);
    });

    it('should suppress an alert on real rule executions', async () => {
      const id = uuidv4();
      const firstTimestamp = new Date().toISOString();

      await eventsFiller({ id, count: 10, timestamp: firstTimestamp });
      await threatsFiller({ id, count: 0, timestamp: firstTimestamp });

      const firstDocument = {
        id,
        '@timestamp': firstTimestamp,
        host: {
          name: 'host-a',
        },
      };
      await indexListOfSourceDocuments([firstDocument]);

      await addThreatDocuments({
        id,
        timestamp: firstTimestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['host-a'],
          duration: {
            value: 300,
            unit: 'm',
          },
          missing_fields_strategy: 'suppress',
        },
        from: 'now-35m',
        interval: '30m',
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getOpenAlerts(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).toEqual(1);

      // suppression start equal to alert timestamp
      const suppressionStart = alerts.hits.hits[0]._source?.[TIMESTAMP];

      expect(alerts.hits.hits[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-a',
            },
          ],
          // suppression boundaries equal to alert time, since no alert been suppressed
          [ALERT_SUPPRESSION_START]: suppressionStart,
          [ALERT_SUPPRESSION_END]: suppressionStart,
          [ALERT_ORIGINAL_TIME]: firstTimestamp,
          [TIMESTAMP]: suppressionStart,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );

      const secondTimestamp = new Date().toISOString();
      const secondDocument = {
        id,
        '@timestamp': secondTimestamp,
        host: {
          name: 'host-a',
        },
      };
      // Add a new document, then disable and re-enable to trigger another rule run. The second doc should
      // trigger an update to the existing alert without changing the timestamp
      await indexListOfSourceDocuments([secondDocument, secondDocument]);
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
      expect(secondAlerts.hits.hits.length).toEqual(1);
      expect(secondAlerts.hits.hits[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-a',
            },
          ],
          [ALERT_ORIGINAL_TIME]: firstTimestamp, // timestamp is the same
          [ALERT_SUPPRESSION_START]: suppressionStart, // suppression start is the same
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2, // 2 alerts from second rule run, that's why 2 suppressed
        })
      );
      // suppression end value should be greater than second document timestamp, but lesser than current time
      const suppressionEnd = new Date(
        secondAlerts.hits.hits[0]._source?.[ALERT_SUPPRESSION_END] as string
      ).getTime();
      expect(suppressionEnd).toBeLessThan(new Date().getTime());
      expect(suppressionEnd).toBeGreaterThan(new Date(secondTimestamp).getDate());
    });

    it('should NOT suppress and update an alert if the alert is closed', async () => {
      const id = uuidv4();
      const firstTimestamp = new Date().toISOString();

      await eventsFiller({ id, count: 10, timestamp: firstTimestamp });
      await threatsFiller({ id, count: 0, timestamp: firstTimestamp });

      const firstDocument = {
        id,
        '@timestamp': firstTimestamp,
        host: {
          name: 'host-a',
        },
      };
      await indexListOfSourceDocuments([firstDocument]);

      await addThreatDocuments({
        id,
        timestamp: firstTimestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['host.name'],
          duration: {
            value: 300,
            unit: 'm',
          },
          missing_fields_strategy: 'suppress',
        },
        from: 'now-35m',
        interval: '30m',
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
      await indexListOfSourceDocuments([secondDocument]);
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
      expect(secondAlerts.hits.hits.length).toEqual(1);
      expect(alerts.hits.hits[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-a',
            },
          ],
          [ALERT_ORIGINAL_TIME]: firstTimestamp,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );
    });

    it('should NOT suppress alerts when suppression period is less than rule interval', async () => {
      const id = uuidv4();
      const firstTimestamp = '2020-10-28T05:45:00.000Z';

      await eventsFiller({ id, count: 10, timestamp: firstTimestamp });
      await threatsFiller({ id, count: 0, timestamp: firstTimestamp });

      const firstRunDoc = {
        id,
        '@timestamp': firstTimestamp,
        host: {
          name: 'host-a',
        },
      };

      const secondRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };

      await indexListOfSourceDocuments([firstRunDoc, secondRunDoc]);

      await addThreatDocuments({
        id,
        timestamp: firstTimestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['host.name'],
          duration: {
            value: 20,
            unit: 'm',
          },
          missing_fields_strategy: 'suppress',
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
              field: 'host.name',
              value: 'host-a',
            },
          ],
          [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );

      expect(previewAlerts[1]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-a',
            },
          ],
          [TIMESTAMP]: '2020-10-28T06:30:00.000Z',
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:30:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        })
      );
    });

    it('should suppress alerts in the time window that covers 3 rule executions', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const firstRunDoc = {
        id,
        '@timestamp': timestamp,
        host: { name: 'host-a' },
      };
      const secondRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };
      const thirdRunDoc = {
        ...firstRunDoc,
        '@timestamp': '2020-10-28T06:45:00.000Z',
      };

      await eventsFiller({ id, count: 10, timestamp });
      await threatsFiller({ id, count: 0, timestamp });

      await indexListOfSourceDocuments([
        firstRunDoc,
        firstRunDoc,
        secondRunDoc,
        secondRunDoc,
        thirdRunDoc,
      ]);

      await addThreatDocuments({
        id,
        timestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['host.name'],
          duration: {
            value: 2,
            unit: 'h',
          },
          missing_fields_strategy: 'suppress',
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
            field: 'host.name',
            value: 'host-a',
          },
        ],
        [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
        [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T07:00:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 4, // in total 4 alert got suppressed: 1 from the first run, 2 from the second, 1 from the third
      });
    });

    it('should suppress the correct alerts based on multi values group_by', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const firstRunDocA = {
        id,
        '@timestamp': timestamp,
        'host.name': 'host-a',
        'agent.version': 1,
      };
      const firstRunDoc2 = {
        ...firstRunDocA,
        'agent.version': 2,
      };
      const firstRunDocB = {
        ...firstRunDocA,
        'host.name': 'host-b',
        'agent.version': 1,
      };

      const secondRunDocA = {
        ...firstRunDocA,
        '@timestamp': '2020-10-28T06:15:00.000Z',
      };

      await eventsFiller({ id, count: 10, timestamp });
      await threatsFiller({ id, count: 0, timestamp });

      await indexListOfSourceDocuments([
        firstRunDocA,
        firstRunDoc2,
        firstRunDocB,
        secondRunDocA,
        secondRunDocA,
        secondRunDocA,
      ]);
      await addThreatDocuments({
        id,
        timestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['host.name', 'agent.version'],
          duration: {
            value: 2,
            unit: 'h',
          },
          missing_fields_strategy: 'suppress',
        },
        from: 'now-35m',
        interval: '30m',
      };

      const { previewId, logs } = await previewRule({
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
      // 3 alerts should be generated:
      // 1. for pair 'host-a', 1 - suppressed
      // 2. for pair 'host-a', 2 - not suppressed
      expect(previewAlerts.length).toEqual(2);
      expect(previewAlerts[0]._source).toEqual({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'host.name',
            value: 'host-a',
          },
          {
            field: 'agent.version',
            value: 1,
          },
        ],
        [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
        [ALERT_LAST_DETECTED]: '2020-10-28T06:30:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 3, // 3 alerts suppressed from the second run
      });
      expect(previewAlerts[1]._source).toEqual({
        ...previewAlerts[1]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'host.name',
            value: 'host-a',
          },
          {
            field: 'agent.version',
            value: 2,
          },
        ],
        [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
        [ALERT_LAST_DETECTED]: '2020-10-28T06:00:00.000Z',
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0, // no suppressed alerts
      });
    });

    it('should correctly suppress when using a timestamp override', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const docWithoutOverride = {
        id,
        '@timestamp': timestamp,
        host: { name: 'host-a' },
        event: {
          ingested: timestamp,
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

      await eventsFiller({ id, count: 10, timestamp });
      await threatsFiller({ id, count: 0, timestamp });

      await indexListOfSourceDocuments([docWithoutOverride, docWithOverride]);

      await addThreatDocuments({
        id,
        timestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['host.name'],
          duration: {
            value: 300,
            unit: 'm',
          },
          missing_fields_strategy: 'suppress',
        },
        from: 'now-35m',
        interval: '30m',
        timestamp_override: 'event.ingested',
      };
      // 1 alert should be suppressed, based on event.ingested value of a document
      const { previewId, logs } = await previewRule({
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

      expect(previewAlerts.length).toEqual(1);
      expect(previewAlerts[0]._source).toEqual({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'host.name',
            value: 'host-a',
          },
        ],
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
      });
    });

    it('should generate and update up to max_signals alerts', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const laterTimestamp = '2020-10-28T06:10:00.000Z';

      await eventsFiller({ id, count: 10, timestamp });
      await threatsFiller({ id, count: 0, timestamp });

      await Promise.all(
        [timestamp, laterTimestamp].map((t) =>
          indexGeneratedSourceDocuments({
            docsCount: 150,
            seed: (index) => ({
              id,
              '@timestamp': t,
              host: {
                name: `host-a`,
              },
            }),
          })
        )
      );
      await addThreatDocuments({
        id,
        timestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['host.name'],
          duration: {
            value: 300,
            unit: 'm',
          },
          missing_fields_strategy: 'suppress',
        },
        from: 'now-35m',
        interval: '30m',
        max_signals: 40,
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
        sort: ['host.name', ALERT_ORIGINAL_TIME],
      });
      expect(previewAlerts.length).toEqual(40);
      expect(previewAlerts[0]._source).toEqual(
        expect.objectContaining({
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'host.name',
              value: 'host-a',
            },
          ],
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        })
      );
    });

    it('should suppress alerts with missing fields', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const secondTimestamp = '2020-10-28T06:10:00.000Z';
      const docWithMissingField1 = {
        id,
        '@timestamp': timestamp,
        host: { name: 'host-a' },
      };

      const doc1 = {
        ...docWithMissingField1,
        agent: { name: 'agent-1' },
      };

      const docWithMissingField2 = {
        ...docWithMissingField1,
        '@timestamp': secondTimestamp,
      };

      const doc2 = {
        ...doc1,
        '@timestamp': secondTimestamp,
      };

      await eventsFiller({ id, count: 10, timestamp });
      await threatsFiller({ id, count: 0, timestamp });

      // 4 alert should be suppressed: 2 for agent.name: 'agent-1' and 2 for missing agent.name
      await indexListOfSourceDocuments([
        doc1,
        doc1,
        docWithMissingField1,
        docWithMissingField1,
        docWithMissingField2,
        doc2,
      ]);

      await addThreatDocuments({
        id,
        timestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['agent.name'],
          duration: {
            value: 300,
            unit: 'm',
          },
          missing_fields_strategy: 'suppress',
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
        sort: ['agent.name', ALERT_ORIGINAL_TIME],
      });
      expect(previewAlerts.length).toEqual(2);
      expect(previewAlerts[0]._source).toEqual({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: 'agent-1',
          },
        ],
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
      });

      expect(previewAlerts[1]._source).toEqual({
        ...previewAlerts[1]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: null,
          },
        ],
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
      });
    });

    it('should not suppress alerts with missing fields if configured so', async () => {
      const id = uuidv4();
      const timestamp = '2020-10-28T05:45:00.000Z';
      const secondTimestamp = '2020-10-28T06:10:00.000Z';
      const docWithMissingField1 = {
        id,
        '@timestamp': timestamp,
        host: { name: 'host-a' },
      };

      const doc1 = {
        ...docWithMissingField1,
        agent: { name: 'agent-1' },
      };

      const docWithMissingField2 = {
        ...docWithMissingField1,
        '@timestamp': secondTimestamp,
      };

      const doc2 = {
        ...doc1,
        '@timestamp': secondTimestamp,
      };

      await eventsFiller({ id, count: 10, timestamp });
      await threatsFiller({ id, count: 0, timestamp });

      // 2 alert should be suppressed: 2 for agent.name: 'agent-1' and not any for missing agent.name
      await indexListOfSourceDocuments([
        doc1,
        doc1,
        docWithMissingField1,
        docWithMissingField1,
        docWithMissingField2,
        doc2,
      ]);

      await addThreatDocuments({
        id,
        timestamp,
        fields: {
          host: {
            name: 'host-a',
          },
        },
        count: 1,
      });

      const rule: ThreatMatchRuleCreateProps = {
        ...indicatorMatchRule(id),
        alert_suppression: {
          group_by: ['agent.name'],
          duration: {
            value: 300,
            unit: 'm',
          },
          missing_fields_strategy: 'doNotSuppress',
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
        sort: ['agent.name', ALERT_ORIGINAL_TIME],
      });
      expect(previewAlerts.length).toEqual(4);
      expect(previewAlerts[0]._source).toEqual({
        ...previewAlerts[0]._source,
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: 'agent-1',
          },
        ],
        [ALERT_ORIGINAL_TIME]: timestamp,
        [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
        [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
        [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
      });

      // rest of alerts are not suppressed and do not have suppress properties
      previewAlerts.slice(1).forEach((previewAlert) => {
        const source = previewAlert._source;
        expect(source).toHaveProperty('id', id);
        expect(source).not.toHaveProperty(ALERT_SUPPRESSION_DOCS_COUNT);
        expect(source).not.toHaveProperty(ALERT_SUPPRESSION_END);
        expect(source).not.toHaveProperty(ALERT_SUPPRESSION_TERMS);
        expect(source).not.toHaveProperty(ALERT_SUPPRESSION_DOCS_COUNT);
      });
    });

    describe('rule execution only', () => {
      it('should suppress alerts during rule execution only', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:45:00.000Z';
        const doc1 = {
          id,
          '@timestamp': timestamp,
          host: { name: 'host-a' },
        };
        // doc2 does not generate alert
        const doc2 = {
          ...doc1,
          host: { name: 'host-b' },
        };

        await eventsFiller({ id, count: 10, timestamp });
        await threatsFiller({ id, count: 0, timestamp });

        await indexListOfSourceDocuments([doc1, doc1, doc1, doc2]);

        await addThreatDocuments({
          id,
          timestamp,
          fields: {
            host: {
              name: 'host-a',
            },
          },
          count: 1,
        });

        const rule: ThreatMatchRuleCreateProps = {
          ...indicatorMatchRule(id),
          alert_suppression: {
            group_by: ['host.name'],
            missing_fields_strategy: 'suppress',
          },
          from: 'now-35m',
          interval: '30m',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T07:00:00.000Z'),
          invocationCount: 1,
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
              field: 'host.name',
              value: 'host-a',
            },
          ],
          [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_START]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
        });
      });

      it('should suppress alerts with missing fields during rule execution only', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:45:00.000Z';
        const doc1 = {
          id,
          '@timestamp': timestamp,
          host: { name: 'host-a' },
        };

        const doc2 = {
          ...doc1,
          agent: { name: 'agent-1' },
        };

        await eventsFiller({ id, count: 10, timestamp });
        await threatsFiller({ id, count: 0, timestamp });

        // 2 alert should be suppressed: 1 doc and 1 doc2
        await indexListOfSourceDocuments([doc1, doc1, doc2, doc2]);

        await addThreatDocuments({
          id,
          timestamp,
          fields: {
            host: {
              name: 'host-a',
            },
          },
          count: 1,
        });

        const rule: ThreatMatchRuleCreateProps = {
          ...indicatorMatchRule(id),
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: 'suppress',
          },
          from: 'now-35m',
          interval: '30m',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T07:00:00.000Z'),
          invocationCount: 1,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: ['agent.name', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).toEqual(2);
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
          [ALERT_SUPPRESSION_START]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });

        expect(previewAlerts[1]._source).toEqual({
          ...previewAlerts[1]._source,
          [ALERT_SUPPRESSION_TERMS]: [
            {
              field: 'agent.name',
              value: null,
            },
          ],
          [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
          [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
          [ALERT_ORIGINAL_TIME]: timestamp,
          [ALERT_SUPPRESSION_START]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
      });

      it('should not suppress alerts with missing fields during rule execution only if configured so', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:45:00.000Z';
        const doc1 = {
          id,
          '@timestamp': timestamp,
          host: { name: 'host-a' },
        };

        const doc2 = {
          ...doc1,
          agent: { name: 'agent-1' },
        };

        await eventsFiller({ id, count: 10, timestamp });
        await threatsFiller({ id, count: 0, timestamp });

        // 1 alert should be suppressed: 1 doc only
        await indexListOfSourceDocuments([doc1, doc1, doc2, doc2]);

        await addThreatDocuments({
          id,
          timestamp,
          fields: {
            host: {
              name: 'host-a',
            },
          },
          count: 1,
        });

        const rule: ThreatMatchRuleCreateProps = {
          ...indicatorMatchRule(id),
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: 'doNotSuppress',
          },
          from: 'now-35m',
          interval: '30m',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T07:00:00.000Z'),
          invocationCount: 1,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: ['agent.name', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).toEqual(3);
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
          [ALERT_SUPPRESSION_START]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });

        // rest of alerts are not suppressed and do not have suppress properties
        previewAlerts.slice(1).forEach((previewAlert) => {
          const source = previewAlert._source;
          expect(source).toHaveProperty('id', id);
          expect(source).not.toHaveProperty(ALERT_SUPPRESSION_DOCS_COUNT);
          expect(source).not.toHaveProperty(ALERT_SUPPRESSION_END);
          expect(source).not.toHaveProperty(ALERT_SUPPRESSION_TERMS);
          expect(source).not.toHaveProperty(ALERT_SUPPRESSION_DOCS_COUNT);
        });
      });
    });
  });
};
