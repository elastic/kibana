/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from 'expect';

import {
  ALERT_REASON,
  ALERT_RULE_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_TERMS,
  ALERT_LAST_DETECTED,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

import { ThresholdRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { Ancestor } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_THRESHOLD_RESULT,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { getMaxSignalsWarning as getMaxAlertsWarning } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
import {
  createRule,
  getOpenAlerts,
  getPreviewAlerts,
  getThresholdRuleForAlertTesting,
  previewRule,
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
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless Threshold type rules', () => {
    before(async () => {
      await esArchiver.load(path);
    });

    after(async () => {
      await esArchiver.unload(path);
    });

    // First test creates a real rule - remaining tests use preview API
    it('generates 1 alert from Threshold rules when threshold is met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: ['host.id'],
          value: 700,
        },
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getOpenAlerts(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).toEqual(1);
      const fullAlert = alerts.hits.hits[0]._source;
      if (!fullAlert) {
        return expect(fullAlert).toBeTruthy();
      }
      const eventIds = (fullAlert?.[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
      expect(fullAlert).toEqual({
        ...fullAlert,
        'host.id': '8cc95778cce5407c809480e8e32ad76b',
        [EVENT_KIND]: 'signal',
        [ALERT_ANCESTORS]: [
          {
            depth: 0,
            id: eventIds[0],
            index: 'auditbeat-*',
            type: 'event',
          },
        ],
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_REASON]: 'event created high alert Alert Testing Query.',
        [ALERT_RULE_UUID]: fullAlert[ALERT_RULE_UUID],
        [ALERT_ORIGINAL_TIME]: fullAlert[ALERT_ORIGINAL_TIME],
        [ALERT_DEPTH]: 1,
        [ALERT_THRESHOLD_RESULT]: {
          terms: [
            {
              field: 'host.id',
              value: '8cc95778cce5407c809480e8e32ad76b',
            },
          ],
          count: 788,
          from: '2019-02-19T07:12:05.332Z',
        },
      });
    });

    it('generates max alerts warning when circuit breaker is exceeded', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 1, // This value generates 7 alerts with the current esArchive
        },
        max_signals: 5,
      };
      const { logs } = await previewRule({ supertest, rule });
      expect(logs[0].warnings).toContain(getMaxAlertsWarning());
    });

    it("doesn't generate max alerts warning when circuit breaker is met but not exceeded", async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 1, // This value generates 7 alerts with the current esArchive
        },
        max_signals: 7,
      };
      const { logs } = await previewRule({ supertest, rule });
      expect(logs[0].warnings).not.toContain(getMaxAlertsWarning());
    });

    it('generates 2 alerts from Threshold rules when threshold is met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 100,
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(2);
    });

    it('applies the provided query before bucketing ', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        query: 'host.id:"2ab45fc1c41e4c84bbd02202a7e5761f"',
        threshold: {
          field: 'process.name',
          value: 21,
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(1);
    });

    it('generates no alerts from Threshold rules when threshold is met and cardinality is not met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 100,
          cardinality: [
            {
              field: 'destination.ip',
              value: 100,
            },
          ],
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(0);
    });

    it('generates no alerts from Threshold rules when cardinality is met and threshold is not met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 1000,
          cardinality: [
            {
              field: 'destination.ip',
              value: 5,
            },
          ],
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(0);
    });

    it('generates alerts from Threshold rules when threshold and cardinality are both met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 100,
          cardinality: [
            {
              field: 'destination.ip',
              value: 5,
            },
          ],
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(1);
      const fullAlert = previewAlerts[0]._source;
      if (!fullAlert) {
        return expect(fullAlert).toBeTruthy();
      }
      const eventIds = (fullAlert?.[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
      expect(fullAlert).toEqual({
        ...fullAlert,
        'host.id': '8cc95778cce5407c809480e8e32ad76b',
        [EVENT_KIND]: 'signal',
        [ALERT_ANCESTORS]: [
          {
            depth: 0,
            id: eventIds[0],
            index: 'auditbeat-*',
            type: 'event',
          },
        ],
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_REASON]: `event created high alert Alert Testing Query.`,
        [ALERT_RULE_UUID]: fullAlert[ALERT_RULE_UUID],
        [ALERT_ORIGINAL_TIME]: fullAlert[ALERT_ORIGINAL_TIME],
        [ALERT_DEPTH]: 1,
        [ALERT_THRESHOLD_RESULT]: {
          terms: [
            {
              field: 'host.id',
              value: '8cc95778cce5407c809480e8e32ad76b',
            },
          ],
          cardinality: [
            {
              field: 'destination.ip',
              value: 7,
            },
          ],
          count: 788,
          from: '2019-02-19T07:12:05.332Z',
        },
      });
    });

    it('should not generate alerts if only one field meets the threshold requirement', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: ['host.id', 'process.name'],
          value: 22,
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(0);
    });

    it('generates alerts from Threshold rules when bucketing by multiple fields', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        threshold: {
          field: ['host.id', 'process.name', 'event.module'],
          value: 21,
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(1);
      const fullAlert = previewAlerts[0]._source;
      if (!fullAlert) {
        return expect(fullAlert).toBeTruthy();
      }
      const eventIds = (fullAlert[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
      expect(fullAlert).toEqual({
        ...fullAlert,
        'event.module': 'system',
        'host.id': '2ab45fc1c41e4c84bbd02202a7e5761f',
        'process.name': 'sshd',
        [EVENT_KIND]: 'signal',
        [ALERT_ANCESTORS]: [
          {
            depth: 0,
            id: eventIds[0],
            index: 'auditbeat-*',
            type: 'event',
          },
        ],
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_REASON]: `event with process sshd, created high alert Alert Testing Query.`,
        [ALERT_RULE_UUID]: fullAlert[ALERT_RULE_UUID],
        [ALERT_ORIGINAL_TIME]: fullAlert[ALERT_ORIGINAL_TIME],
        [ALERT_DEPTH]: 1,
        [ALERT_THRESHOLD_RESULT]: {
          terms: [
            {
              field: 'host.id',
              value: '2ab45fc1c41e4c84bbd02202a7e5761f',
            },
            {
              field: 'process.name',
              value: 'sshd',
            },
            {
              field: 'event.module',
              value: 'system',
            },
          ],
          count: 21,
          from: '2019-02-19T20:22:03.561Z',
        },
      });
    });

    // https://github.com/elastic/kibana/issues/149920
    it('generates 1 alert when threshold is met and rule query has wildcard in field name', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForAlertTesting(['auditbeat-*']),
        query: 'agent.ty*:auditbeat', // this query should match all documents from index and we will receive 1 alert, similarly to "generates 1 alert from Threshold rules when threshold is met" test case
        threshold: {
          field: ['host.id'],
          value: 700,
        },
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getOpenAlerts(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).toEqual(1);
    });

    describe('Timestamp override and fallback', async () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_fallback'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_fallback'
        );
      });

      it('applies timestamp override when using single field', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForAlertTesting(['timestamp-fallback-test']),
          threshold: {
            field: 'host.name',
            value: 1,
          },
          timestamp_override: 'event.ingested',
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).toEqual(4);

        for (const hit of previewAlerts) {
          const originalTime = hit._source?.[ALERT_ORIGINAL_TIME];
          const hostName = hit._source?.['host.name'];
          if (hostName === 'host-1') {
            expect(originalTime).toEqual('2020-12-16T15:15:18.570Z');
          } else if (hostName === 'host-2') {
            expect(originalTime).toEqual('2020-12-16T15:16:18.570Z');
          } else if (hostName === 'host-3') {
            expect(originalTime).toEqual('2020-12-16T16:15:18.570Z');
          } else {
            expect(originalTime).toEqual('2020-12-16T16:16:18.570Z');
          }
        }
      });

      it('applies timestamp override when using multiple fields', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForAlertTesting(['timestamp-fallback-test']),
          threshold: {
            field: ['host.name', 'source.ip'],
            value: 1,
          },
          timestamp_override: 'event.ingested',
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).toEqual(4);

        for (const hit of previewAlerts) {
          const originalTime = hit._source?.[ALERT_ORIGINAL_TIME];
          const hostName = hit._source?.['host.name'];
          if (hostName === 'host-1') {
            expect(originalTime).toEqual('2020-12-16T15:15:18.570Z');
          } else if (hostName === 'host-2') {
            expect(originalTime).toEqual('2020-12-16T15:16:18.570Z');
          } else if (hostName === 'host-3') {
            expect(originalTime).toEqual('2020-12-16T16:15:18.570Z');
          } else {
            expect(originalTime).toEqual('2020-12-16T16:16:18.570Z');
          }
        }
      });
    });

    describe('with host risk index', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/risks');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/risks');
      });

      it('should be enriched with host risk score', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForAlertTesting(['auditbeat-*']),
          threshold: {
            field: 'host.name',
            value: 100,
          },
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId, sort: ['host.name'] });

        expect(previewAlerts[0]?._source?.host?.risk?.calculated_level).toEqual('Low');
        expect(previewAlerts[0]?._source?.host?.risk?.calculated_score_norm).toEqual(20);
        expect(previewAlerts[1]?._source?.host?.risk?.calculated_level).toEqual('Critical');
        expect(previewAlerts[1]?._source?.host?.risk?.calculated_score_norm).toEqual(96);
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
            group_by: ['agent.name'],
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
            [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
            [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:00.000Z',
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
            [ALERT_SUPPRESSION_START]: '2020-10-28T06:30:00.000Z',
            [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
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
            group_by: ['agent.name'],
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
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
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
            group_by: ['agent.name'],
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
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T07:00:00.000Z',
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
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
            group_by: ['agent.name', 'agent.type'],
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
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
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
            group_by: ['agent.name'],
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
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_SUPPRESSION_END]: '2020-10-28T06:30:00.000Z',
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
            group_by: ['agent.name'],
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
  });
};
