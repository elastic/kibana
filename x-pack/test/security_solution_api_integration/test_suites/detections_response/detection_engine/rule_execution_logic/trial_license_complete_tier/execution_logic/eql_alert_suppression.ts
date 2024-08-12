/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import sortBy from 'lodash/sortBy';

import { EqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_TERMS,
  ALERT_LAST_DETECTED,
  TIMESTAMP,
  ALERT_START,
} from '@kbn/rule-data-utils';
import {
  DETECTION_ENGINE_SIGNALS_STATUS_URL as DETECTION_ENGINE_ALERTS_STATUS_URL,
  ENABLE_ASSET_CRITICALITY_SETTING,
} from '@kbn/security-solution-plugin/common/constants';
import { getSuppressionMaxSignalsWarning as getSuppressionMaxAlertsWarning } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
import { RuleExecutionStatusEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
  waitForRuleSuccess,
} from '../../../../../../../common/utils/security_solution';
import {
  getEqlRuleForAlertTesting,
  getOpenAlerts,
  getPreviewAlerts,
  previewRule,
  dataGeneratorFactory,
  patchRule,
  setAlertStatus,
  fetchRule,
  previewRuleWithExceptionEntries,
} from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';

const getQuery = (id: string) => `any where id == "${id}"`;
const getSequenceQuery = (id: string) =>
  `sequence by id [any where id == "${id}"] [any where id == "${id}"]`;

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const {
    indexListOfDocuments: indexListOfSourceDocuments,
    indexGeneratedDocuments: indexGeneratedSourceDocuments,
  } = dataGeneratorFactory({
    es,
    index: 'ecs_compliant',
    log,
  });

  // NOTE: Add to second quality gate after feature is GA
  describe('@ess @serverless Alert Suppression for EQL rules', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('non-sequence queries', () => {
      describe('with "per time interval" suppression duration', () => {
        it('suppresses alerts across two rule executions when the suppression duration exceeds the rule interval', async () => {
          const id = uuidv4();
          const firstTimestamp = new Date().toISOString();

          const firstDocument = {
            id,
            '@timestamp': firstTimestamp,
            host: {
              name: 'host-a',
            },
          };
          await indexListOfSourceDocuments([firstDocument]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
          expect(alerts.hits.hits).toHaveLength(1);

          // suppression start equal to alert timestamp
          const suppressionStart = alerts.hits.hits[0]._source?.[TIMESTAMP];

          expect(alerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'host.name',
                  value: ['host-a'],
                },
              ],
              // suppression boundaries equal to original event time, since no alert been suppressed
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
                  value: ['host-a'],
                },
              ],
              [ALERT_ORIGINAL_TIME]: firstTimestamp, // timestamp is the same
              [ALERT_SUPPRESSION_START]: firstTimestamp, // suppression start is the same
              [ALERT_SUPPRESSION_END]: secondTimestamp, // suppression end is updated
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

        it('does not suppress a new alert and update the original alert if the original alert is closed', async () => {
          const id = uuidv4();
          const firstTimestamp = new Date().toISOString();

          const firstDocument = {
            id,
            '@timestamp': firstTimestamp,
            host: {
              name: 'host-a',
            },
          };
          await indexListOfSourceDocuments([firstDocument]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
          const alertIds = alerts.hits.hits.map((alert) => alert._id!);

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
          await getOpenAlerts(
            supertest,
            log,
            es,
            createdRule,
            RuleExecutionStatusEnum.succeeded,
            undefined,
            afterTimestamp
          );

          expect(alerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'host.name',
                  value: ['host-a'],
                },
              ],
              [ALERT_ORIGINAL_TIME]: firstTimestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
            })
          );
        });

        it('deduplicates new alerts if they were previously created without suppression', async () => {
          const id = uuidv4();
          const firstTimestamp = new Date().toISOString();

          const ruleWithoutSuppression: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
            from: 'now-35m',
            interval: '30m',
          };
          const alertSuppression = {
            group_by: ['host.name'],
            duration: {
              value: 300,
              unit: 'm' as const,
            },
            missing_fields_strategy: 'suppress',
          };

          const firstDocument = {
            id,
            '@timestamp': firstTimestamp,
            host: {
              name: 'host-a',
            },
          };
          await indexListOfSourceDocuments([firstDocument, firstDocument]);

          const createdRule = await createRule(supertest, log, ruleWithoutSuppression);
          const alerts = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alerts.hits.hits).toHaveLength(2);
          // alert does not have suppression properties
          alerts.hits.hits.forEach((previewAlert) => {
            const source = previewAlert._source;
            expect(source).toHaveProperty('id', id);
            expect(source).not.toHaveProperty(ALERT_SUPPRESSION_DOCS_COUNT);
            expect(source).not.toHaveProperty(ALERT_SUPPRESSION_END);
            expect(source).not.toHaveProperty(ALERT_SUPPRESSION_TERMS);
            expect(source).not.toHaveProperty(ALERT_SUPPRESSION_DOCS_COUNT);
          });

          const secondTimestamp = new Date().toISOString();
          const secondDocument = {
            id,
            '@timestamp': secondTimestamp,
            host: {
              name: 'host-a',
            },
          };

          await indexListOfSourceDocuments([secondDocument, secondDocument]);

          // update the rule to include suppression
          await patchRule(supertest, log, {
            id: createdRule.id,
            alert_suppression: alertSuppression,
            enabled: false,
          });
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

          expect(secondAlerts.hits.hits.length).toEqual(3);

          const sortedAlerts = sortBy(secondAlerts.hits.hits, ALERT_ORIGINAL_TIME);

          // third alert is generated with suppression
          expect(sortedAlerts[2]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'host.name',
                  value: ['host-a'],
                },
              ],
              [ALERT_ORIGINAL_TIME]: secondTimestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
            })
          );
        });

        it('does not suppress alerts when suppression duration is less than rule interval', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:15:00.000Z';

          const firstRunDoc = {
            id,
            '@timestamp': firstTimestamp,
            host: {
              name: 'host-a',
            },
          };
          const secondRunDoc = {
            ...firstRunDoc,
            '@timestamp': secondTimestamp,
          };

          await indexListOfSourceDocuments([firstRunDoc, secondRunDoc]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
                  value: ['host-a'],
                },
              ],
              [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
              [ALERT_SUPPRESSION_START]: firstTimestamp,
              [ALERT_SUPPRESSION_END]: firstTimestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
            })
          );

          expect(previewAlerts[1]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'host.name',
                  value: ['host-a'],
                },
              ],
              [TIMESTAMP]: '2020-10-28T06:30:00.000Z',
              [ALERT_SUPPRESSION_START]: secondTimestamp,
              [ALERT_SUPPRESSION_END]: secondTimestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
            })
          );
        });

        it('suppresses alerts across three rule executions', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:15:00.000Z';
          const thirdTimestamp = '2020-10-28T06:45:00.000Z';
          const firstRunDoc = {
            id,
            '@timestamp': firstTimestamp,
            host: { name: 'host-a' },
          };
          const secondRunDoc = {
            ...firstRunDoc,
            '@timestamp': secondTimestamp,
          };
          const thirdRunDoc = {
            ...firstRunDoc,
            '@timestamp': thirdTimestamp,
          };

          await indexListOfSourceDocuments([
            firstRunDoc,
            firstRunDoc,
            secondRunDoc,
            secondRunDoc,
            thirdRunDoc,
          ]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
                value: ['host-a'],
              },
            ],
            [TIMESTAMP]: '2020-10-28T06:00:00.000Z',
            [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z', // Note: ALERT_LAST_DETECTED gets updated, timestamp does not
            [ALERT_START]: '2020-10-28T06:00:00.000Z',
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: thirdTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 4, // in total 4 alert got suppressed: 1 from the first run, 2 from the second, 1 from the third
          });
        });

        it('suppresses alerts when using a timestamp override', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:10:00.000Z';
          const docWithoutOverride = {
            id,
            '@timestamp': firstTimestamp,
            host: { name: 'host-a' },
            event: {
              ingested: firstTimestamp,
            },
          };
          const docWithOverride = {
            ...docWithoutOverride,
            // This doc simulates a very late arriving doc
            '@timestamp': '2020-10-28T03:00:00.000Z',
            event: {
              ingested: secondTimestamp,
            },
          };

          await indexListOfSourceDocuments([docWithoutOverride, docWithOverride]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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

          expect(previewAlerts.length).toEqual(1);
          expect(previewAlerts[0]._source).toEqual({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: ['host-a'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });
        });

        it('ignores duplicate alerts while suppressing new ones', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:10:00.000Z';
          const doc1 = {
            id,
            '@timestamp': firstTimestamp,
            host: { name: 'host-a' },
          };

          const doc2 = {
            ...doc1,
            '@timestamp': secondTimestamp,
          };

          // 4 alert should be suppressed
          await indexListOfSourceDocuments([doc1, doc1, doc2, doc2, doc2]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
            alert_suppression: {
              group_by: ['host.name'],
              duration: {
                value: 300,
                unit: 'm',
              },
              missing_fields_strategy: 'suppress',
            },
            // large look-back time covers all docs
            from: 'now-1h',
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
            sort: ['host.name', ALERT_ORIGINAL_TIME],
          });
          expect(previewAlerts.length).toEqual(1);
          expect(previewAlerts[0]._source).toEqual({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: ['host-a'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 4,
          });
        });

        it('suppress alerts with missing fields when rule is configured to do so', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:10:00.000Z';
          const docWithMissingField1 = {
            id,
            '@timestamp': firstTimestamp,
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

          // 4 alert should be suppressed: 2 for agent.name: 'agent-1' and 2 for missing agent.name
          await indexListOfSourceDocuments([
            doc1,
            doc1,
            docWithMissingField1,
            docWithMissingField1,
            docWithMissingField2,
            doc2,
          ]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
                value: ['agent-1'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
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
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          });
        });

        it('does not suppress alerts with missing fields if configured as such', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:10:00.000Z';
          const docWithMissingField1 = {
            id,
            '@timestamp': firstTimestamp,
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

          // 2 alert should be suppressed: 2 for agent.name: 'agent-1' and not any for missing agent.name
          await indexListOfSourceDocuments([
            doc1,
            doc1,
            docWithMissingField1,
            docWithMissingField1,
            docWithMissingField2,
            doc2,
          ]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
                value: ['agent-1'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
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
      });

      describe('with "per rule execution" suppression duration', () => {
        it('only suppresses alerts within the rule execution', async () => {
          const id = uuidv4();
          const timestamp = '2020-10-28T06:45:00.000Z';
          const laterTimestamp = '2020-10-28T06:50:00.000Z';
          const doc1 = {
            id,
            '@timestamp': timestamp,
            host: { name: 'host-a' },
          };
          const doc1WithLaterTimestamp = {
            ...doc1,
            '@timestamp': laterTimestamp,
          };

          await indexListOfSourceDocuments([doc1, doc1WithLaterTimestamp, doc1]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
                value: ['host-a'],
              },
            ],
            [TIMESTAMP]: '2020-10-28T07:00:00.000Z',
            [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z',
            [ALERT_ORIGINAL_TIME]: timestamp,
            [ALERT_SUPPRESSION_START]: timestamp,
            [ALERT_SUPPRESSION_END]: laterTimestamp, // suppression ends with later timestamp
            [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          });
        });

        it('suppresses alerts on a field with array values', async () => {
          const id = uuidv4();
          const timestamp = '2020-10-28T06:45:00.000Z';
          const doc1 = {
            id,
            '@timestamp': timestamp,
            host: { name: ['host-a', 'host-b'] },
          };

          await indexListOfSourceDocuments([doc1, doc1, doc1]);
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
                value: ['host-a', 'host-b'],
              },
            ],
            [TIMESTAMP]: '2020-10-28T07:00:00.000Z',
            [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z',
            [ALERT_ORIGINAL_TIME]: timestamp,
            [ALERT_SUPPRESSION_START]: timestamp,
            [ALERT_SUPPRESSION_END]: timestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          });
        });

        it('suppresses alerts with missing fields', async () => {
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

          // 2 alert should be suppressed: 1 doc and 1 doc2
          await indexListOfSourceDocuments([doc1, doc1, doc2, doc2]);
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
                value: ['agent-1'],
              },
            ],
            [TIMESTAMP]: '2020-10-28T07:00:00.000Z',
            [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z',
            [ALERT_ORIGINAL_TIME]: timestamp,
            [ALERT_SUPPRESSION_START]: timestamp,
            [ALERT_SUPPRESSION_END]: timestamp,
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
            [TIMESTAMP]: '2020-10-28T07:00:00.000Z',
            [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z',
            [ALERT_ORIGINAL_TIME]: timestamp,
            [ALERT_SUPPRESSION_START]: timestamp,
            [ALERT_SUPPRESSION_END]: timestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });
        });

        it('suppresses alerts with missing fields and multiple suppress by fields', async () => {
          const id = uuidv4();
          const timestamp = '2020-10-28T06:45:00.000Z';
          const noMissingFieldsDoc = {
            id,
            '@timestamp': timestamp,
            host: { name: 'host-a' },
            agent: { name: 'agent-a', version: 10 },
          };

          const missingNameFieldsDoc = {
            ...noMissingFieldsDoc,
            agent: { version: 10 },
          };

          const missingVersionFieldsDoc = {
            ...noMissingFieldsDoc,
            agent: { name: 'agent-a' },
          };

          const missingAgentFieldsDoc = {
            ...noMissingFieldsDoc,
            agent: undefined,
          };

          // 4 alerts should be suppressed: 1 for each pair of documents
          await indexListOfSourceDocuments([
            noMissingFieldsDoc,
            noMissingFieldsDoc,
            missingNameFieldsDoc,
            missingNameFieldsDoc,
            missingVersionFieldsDoc,
            missingVersionFieldsDoc,
            missingAgentFieldsDoc,
            missingAgentFieldsDoc,
          ]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
            alert_suppression: {
              group_by: ['agent.name', 'agent.version'],
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
            sort: ['agent.name', 'agent.version', ALERT_ORIGINAL_TIME],
          });
          expect(previewAlerts.length).toEqual(4);
          expect(previewAlerts[0]._source).toEqual({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: ['agent-a'],
              },
              {
                field: 'agent.version',
                value: ['10'],
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });

          expect(previewAlerts[1]._source).toEqual({
            ...previewAlerts[1]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: ['agent-a'],
              },
              {
                field: 'agent.version',
                value: null,
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });

          expect(previewAlerts[2]._source).toEqual({
            ...previewAlerts[2]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: null,
              },
              {
                field: 'agent.version',
                value: ['10'],
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });

          expect(previewAlerts[3]._source).toEqual({
            ...previewAlerts[3]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: null,
              },
              {
                field: 'agent.version',
                value: null,
              },
            ],
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });
        });

        it('does not suppress alerts with missing fields if configured as such', async () => {
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

          // 1 alert should be suppressed: 1 doc only
          await indexListOfSourceDocuments([doc1, doc1, doc2, doc2]);
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
                value: ['agent-1'],
              },
            ],
            [TIMESTAMP]: '2020-10-28T07:00:00.000Z',
            [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z',
            [ALERT_ORIGINAL_TIME]: timestamp,
            [ALERT_SUPPRESSION_START]: timestamp,
            [ALERT_SUPPRESSION_END]: timestamp,
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

        it('does not suppress alerts with missing fields and multiple suppress by fields if configured as such', async () => {
          const id = uuidv4();
          const timestamp = '2020-10-28T06:45:00.000Z';
          const noMissingFieldsDoc = {
            id,
            '@timestamp': timestamp,
            host: { name: 'host-a' },
            agent: { name: 'agent-a', version: 10 },
          };

          const missingNameFieldsDoc = {
            ...noMissingFieldsDoc,
            agent: { version: 10 },
          };

          const missingVersionFieldsDoc = {
            ...noMissingFieldsDoc,
            agent: { name: 'agent-a' },
          };

          const missingAgentFieldsDoc = {
            ...noMissingFieldsDoc,
            agent: undefined,
          };

          // 1 alert should be suppressed: 1 doc only
          await indexListOfSourceDocuments([
            noMissingFieldsDoc,
            noMissingFieldsDoc,
            missingNameFieldsDoc,
            missingNameFieldsDoc,
            missingVersionFieldsDoc,
            missingVersionFieldsDoc,
            missingAgentFieldsDoc,
          ]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
            alert_suppression: {
              group_by: ['agent.name', 'agent.version'],

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
            sort: ['agent.name', 'agent.version', ALERT_ORIGINAL_TIME],
          });
          // from 7 injected, only one should be suppressed
          expect(previewAlerts.length).toEqual(6);
          expect(previewAlerts[0]._source).toEqual({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'agent.name',
                value: ['agent-a'],
              },
              {
                field: 'agent.version',
                value: ['10'],
              },
            ],
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

        it('deduplicates multiple alerts while suppressing on rule interval only', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:10:00.000Z';
          const doc1 = {
            id,
            '@timestamp': firstTimestamp,
            host: { name: 'host-a' },
          };

          const doc2 = {
            ...doc1,
            '@timestamp': secondTimestamp,
          };

          // 4 alert should be suppressed
          await indexListOfSourceDocuments([doc1, doc1, doc2, doc2, doc2]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
            alert_suppression: {
              group_by: ['host.name'],
              missing_fields_strategy: 'suppress',
            },
            // large look-back time covers all docs
            from: 'now-50m',
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
            sort: ['host.name', ALERT_ORIGINAL_TIME],
          });
          expect(previewAlerts.length).toEqual(2);
          expect(previewAlerts[0]._source).toEqual({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: ['host-a'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: firstTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });

          expect(previewAlerts[1]._source).toEqual({
            ...previewAlerts[1]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: ['host-a'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: secondTimestamp,
            [ALERT_SUPPRESSION_START]: secondTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          });
        });

        it('deduplicates a single alert while suppressing new ones', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:10:00.000Z';
          const doc1 = {
            id,
            '@timestamp': firstTimestamp,
            host: { name: 'host-a' },
          };

          const doc2 = {
            ...doc1,
            '@timestamp': secondTimestamp,
          };

          // 3 alerts should be suppressed
          await indexListOfSourceDocuments([doc1, doc2, doc2, doc2]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
            alert_suppression: {
              group_by: ['host.name'],
              missing_fields_strategy: 'suppress',
            },
            // large look-back time covers all docs
            from: 'now-1h',
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
            sort: ['host.name', ALERT_ORIGINAL_TIME],
          });
          expect(previewAlerts.length).toEqual(2);
          expect(previewAlerts[0]._source).toEqual({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: ['host-a'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: firstTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
          });
          expect(previewAlerts[1]._source).toEqual({
            ...previewAlerts[1]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: ['host-a'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: secondTimestamp,
            [ALERT_SUPPRESSION_START]: secondTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          });
        });

        it('creates and suppresses an alert into alert created on previous execution', async () => {
          const id = uuidv4();
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:10:00.000Z';
          const doc1 = {
            id,
            '@timestamp': firstTimestamp,
            host: { name: 'host-a' },
          };

          const doc2 = {
            ...doc1,
            '@timestamp': secondTimestamp,
          };

          // 1 created + 1 suppressed on first run
          // 1 created + 2 suppressed on second run
          await indexListOfSourceDocuments([doc1, doc1, doc2, doc2, doc2]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
            timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
            invocationCount: 2,
          });
          const previewAlerts = await getPreviewAlerts({
            es,
            previewId,
            sort: ['host.name', ALERT_ORIGINAL_TIME],
          });
          expect(previewAlerts.length).toEqual(2);
          expect(previewAlerts[0]._source).toEqual({
            ...previewAlerts[0]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: ['host-a'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: firstTimestamp,
            [ALERT_SUPPRESSION_START]: firstTimestamp,
            [ALERT_SUPPRESSION_END]: firstTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          });
          expect(previewAlerts[1]._source).toEqual({
            ...previewAlerts[1]._source,
            [ALERT_SUPPRESSION_TERMS]: [
              {
                field: 'host.name',
                value: ['host-a'],
              },
            ],
            [ALERT_ORIGINAL_TIME]: secondTimestamp,
            [ALERT_SUPPRESSION_START]: secondTimestamp,
            [ALERT_SUPPRESSION_END]: secondTimestamp,
            [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          });
        });
      });

      // Given that EQL rules have a maximum size for querying documents up to 100,
      // even increasing the suppressed alerts limit by five times
      // the suppression max signals won't have an effect
      it('does not suppress more than the EQL query size limit of 100', async () => {
        const id = uuidv4();

        await indexGeneratedSourceDocuments({
          docsCount: 150, // the eql query max size is 100
          seed: (index) => ({
            id,
            '@timestamp': `2020-10-28T06:50:00.${index}Z`,
            host: {
              name: `host-a`,
            },
            agent: { name: 'agent-a' },
          }),
        });

        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['ecs_compliant']),
          query: getQuery(id),
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: 'suppress',
          },
          from: 'now-35m',
          interval: '30m',
        };

        const { previewId, logs } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T07:00:00.000Z'),
          invocationCount: 1,
        });

        expect(logs[0].warnings).toEqual(
          expect.arrayContaining([getSuppressionMaxAlertsWarning()])
        );

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
              value: ['agent-a'],
            },
          ],
          [ALERT_SUPPRESSION_DOCS_COUNT]: 99,
        });
      });

      it('generates up to max_signals alerts', async () => {
        const id = uuidv4();
        const firstTimestamp = '2020-10-28T06:05:00.000Z';
        const secondTimestamp = '2020-10-28T06:10:00.000Z';
        await Promise.all(
          [firstTimestamp, secondTimestamp].map((t) =>
            indexGeneratedSourceDocuments({
              docsCount: 115,
              seed: (index) => ({
                id,
                '@timestamp': t,
                host: {
                  name: `host-a`,
                },
                'agent.name': `agent-${index}`,
              }),
            })
          )
        );

        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['ecs_compliant']),
          query: getQuery(id),
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

        const { previewId, logs } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        expect(logs[0].warnings).toEqual(
          expect.arrayContaining([getSuppressionMaxAlertsWarning()])
        );

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 1000,
          sort: ['agent.name', ALERT_ORIGINAL_TIME],
        });
        expect(previewAlerts.length).toEqual(100);
      });

      it('adds execution values to rule execution state', async () => {
        const eventId = uuidv4();
        await indexGeneratedSourceDocuments({
          docsCount: 10,
          seed: (_index, _id, timestamp) => ({
            id: eventId,
            '@timestamp': timestamp,
            agent: { name: 'group_me' },
          }),
        });

        const ruleParams: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['ecs_compliant']),
          query: getQuery(eventId),
          alert_suppression: {
            group_by: ['agent.name'],
            duration: {
              value: 300,
              unit: 'm',
            },
            missing_fields_strategy: 'suppress',
          },
          from: 'now-35m',
        };

        const { id } = await createRule(supertest, log, ruleParams);
        await waitForRuleSuccess({ supertest, log, id });
        const rule = await fetchRule(supertest, { id });

        const lastExecution = rule?.execution_summary?.last_execution!;
        expect(lastExecution.status).toEqual('succeeded');
        expect(lastExecution.metrics).toEqual(
          expect.objectContaining({
            total_indexing_duration_ms: expect.any(Number),
            total_search_duration_ms: expect.any(Number),
          })
        );
      });

      describe('with exceptions', () => {
        beforeEach(async () => {
          await deleteAllExceptions(supertest, log);
        });

        it('applies exceptions to what would otherwise be suppressed alerts', async () => {
          const id = uuidv4();
          const timestamp = '2020-10-28T06:45:00.000Z';
          const laterTimestamp = '2020-10-28T06:50:00.000Z';

          const firstExecutionDocuments = [
            {
              host: { name: 'host-a', ip: '127.0.0.3' },
              id,
              '@timestamp': timestamp,
            },
            {
              host: { name: 'host-a', ip: '127.0.0.4' },
              id,
              '@timestamp': timestamp,
            },
            {
              host: { name: 'host-a', ip: '127.0.0.5' },
              id,
              '@timestamp': laterTimestamp,
            },
          ];

          await indexListOfSourceDocuments([...firstExecutionDocuments]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
            alert_suppression: {
              group_by: ['host.name'],
              missing_fields_strategy: 'suppress',
            },
            from: 'now-35m',
            interval: '30m',
          };

          const { previewId } = await previewRuleWithExceptionEntries({
            supertest,
            rule,
            log,
            timeframeEnd: new Date('2020-10-28T07:00:00.000Z'),
            entries: [
              [
                {
                  field: 'host.ip',
                  operator: 'included',
                  type: 'match',
                  value: '127.0.0.4',
                },
              ],
            ],
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
                value: ['host-a'],
              },
            ],
            [TIMESTAMP]: '2020-10-28T07:00:00.000Z',
            [ALERT_LAST_DETECTED]: '2020-10-28T07:00:00.000Z',
            [ALERT_ORIGINAL_TIME]: timestamp,
            [ALERT_SUPPRESSION_START]: timestamp,
            [ALERT_SUPPRESSION_END]: laterTimestamp, // suppression ends with later timestamp
            [ALERT_SUPPRESSION_DOCS_COUNT]: 1, // one of the three events was excluded by the exception
          });
        });
      });

      describe('alert enrichment', () => {
        const kibanaServer = getService('kibanaServer');

        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/entity/risks');
          await esArchiver.load('x-pack/test/functional/es_archives/asset_criticality');
          await kibanaServer.uiSettings.update({
            [ENABLE_ASSET_CRITICALITY_SETTING]: true,
          });
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/entity/risks');
          await esArchiver.unload('x-pack/test/functional/es_archives/asset_criticality');
        });

        it('suppressed alerts are enriched with host risk score', async () => {
          const eventId = uuidv4();
          await indexGeneratedSourceDocuments({
            docsCount: 1,
            seed: (_index, _id, timestamp) => ({
              id: eventId,
              '@timestamp': timestamp,
              host: { name: 'suricata-zeek-sensor-toronto' },
            }),
          });

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(eventId),
            alert_suppression: {
              group_by: ['host.name'],
              missing_fields_strategy: 'suppress',
            },
            from: 'now-35m',
            to: 'now',
          };

          const { previewId } = await previewRule({ supertest, rule });
          const previewAlerts = await getPreviewAlerts({ es, previewId });

          expect(previewAlerts[0]?._source?.host?.risk?.calculated_level).toBe('Critical');
          expect(previewAlerts[0]?._source?.host?.risk?.calculated_score_norm).toBe(96);
        });

        it('suppressed alerts are enriched with criticality_level', async () => {
          const id = uuidv4();
          const timestamp = '2020-10-28T06:45:00.000Z';

          const firstExecutionDocuments = [
            {
              host: { name: 'zeek-newyork-sha-aa8df15', ip: '127.0.0.5' },
              user: { name: 'root' },
              id,
              '@timestamp': timestamp,
            },
          ];

          await indexListOfSourceDocuments([...firstExecutionDocuments]);

          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['ecs_compliant']),
            query: getQuery(id),
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
          });
          const previewAlerts = await getPreviewAlerts({ es, previewId });
          const fullAlert = previewAlerts[0]._source;

          expect(fullAlert?.['host.asset.criticality']).toBe('medium_impact');
          expect(fullAlert?.['user.asset.criticality']).toBe('extreme_impact');
        });
      });
    });

    describe('sequence queries', () => {
      it('logs a warning if suppression is configured', async () => {
        const id = uuidv4();
        await indexGeneratedSourceDocuments({
          docsCount: 10,
          seed: () => ({ id }),
        });

        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['ecs_compliant']),
          query: getSequenceQuery(id),
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

        const { logs } = await previewRule({
          supertest,
          rule,
          invocationCount: 1,
        });

        const [{ warnings }] = logs;

        expect(warnings).toContain(
          'Suppression is not supported for EQL sequence queries. The rule will proceed without suppression.'
        );
      });
    });
  });
};
