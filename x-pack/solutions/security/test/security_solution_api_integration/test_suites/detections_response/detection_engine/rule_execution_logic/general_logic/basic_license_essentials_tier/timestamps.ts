/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { orderBy } from 'lodash';
import { RuleExecutionStatusEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import type {
  EqlRuleCreateProps,
  QueryRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';

import type { Client } from '@elastic/elasticsearch';
import {
  getAlerts,
  getEqlRuleForAlertTesting,
  getCustomQueryRuleParams,
  waitForAlertToComplete,
} from '../../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  createRule,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
  getRuleForAlertTesting,
  getAlertsByIds,
  waitForRulePartialFailure,
} from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const detectionsApi = getService('detectionsApi');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');
  /**
   * Tests around timestamps within alerts such as the copying of timestamps correctly into
   * the "signal.original_time" field, ensuring that timestamp overrides operate, and ensuring that
   * partial errors happen correctly
   */
  describe('@ess @serverless @serverlessQA timestamp tests', () => {
    describe('alerts generated from events with a timestamp in seconds is converted correctly into the forced ISO8601 format when copying', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/timestamp_in_seconds'
        );
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/timestamp_override_5'
        );
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/timestamp_in_seconds'
        );
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/timestamp_override_5'
        );
      });

      describe('KQL query', () => {
        it('should convert the @timestamp which is epoch_seconds into the correct ISO format', async () => {
          const rule = getRuleForAlertTesting(['timestamp_in_seconds']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.[ALERT_ORIGINAL_TIME]).sort();
          expect(hits).toEqual(['2021-06-02T23:33:15.000Z']);
        });

        it('should still use the @timestamp field even with an override field. It should never use the override field', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['myfakeindex-5']),
            timestamp_override: 'event.ingested',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.[ALERT_ORIGINAL_TIME]).sort();
          expect(hits).toEqual(['2020-12-16T15:16:18.000Z']);
        });
      });

      describe('EQL query', () => {
        it('should convert the @timestamp which is epoch_seconds into the correct ISO format for EQL', async () => {
          const rule = getEqlRuleForAlertTesting(['timestamp_in_seconds']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.[ALERT_ORIGINAL_TIME]).sort();
          expect(hits).toEqual(['2021-06-02T23:33:15.000Z']);
        });

        it('should still use the @timestamp field even with an override field. It should never use the override field', async () => {
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['myfakeindex-5']),
            timestamp_override: 'event.ingested',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.[ALERT_ORIGINAL_TIME]).sort();
          expect(hits).toEqual(['2020-12-16T15:16:18.000Z']);
        });
      });
    });

    /**
     * Here we test the functionality of timestamp overrides. If the rule specifies a timestamp override,
     * then the documents will be queried and sorted using the timestamp override field.
     * If no timestamp override field exists in the indices but one was provided to the rule,
     * the rule's query will additionally search for events using the `@timestamp` field
     */
    describe('alerts generated from events with timestamp override field', () => {
      const EVENTS_INDEX_NAME = 'myfakeindex-1';
      const EVENT_DOC_WITHOUT_TIMESTAMPS = { message: 'hello world 1' };
      const EVENT_DOC_WITH_DEFAULT_TIMESTAMP = {
        message: 'hello world 3',
        '@timestamp': new Date(Date.now() - 1),
      };
      const EVENT_DOC_WITH_CUSTOM_TIMESTAMP = {
        message: 'hello world 2',
        event: {
          ingested: new Date(Date.now() - 2).toISOString(),
        },
      };
      const EVENT_DOC_WITH_BOTH_TIMESTAMPS = {
        message: 'hello world 4',
        '@timestamp': new Date(Date.now() - 3).toISOString(),
        event: {
          ingested: new Date(Date.now() - 4).toISOString(),
        },
      };

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllAlerts(supertest, log, es);
        await createAlertsIndex(supertest, log);
      });

      describe('KQL', () => {
        describe('timestamp fallback is enabled', () => {
          it('generates alerts for events having the default timestamp field', async () => {
            await ingestEvents({
              es,
              indexName: EVENTS_INDEX_NAME,
              events: [
                EVENT_DOC_WITHOUT_TIMESTAMPS,
                EVENT_DOC_WITH_DEFAULT_TIMESTAMP,
                EVENT_DOC_WITH_CUSTOM_TIMESTAMP,
                EVENT_DOC_WITH_BOTH_TIMESTAMPS,
              ],
            });

            const {
              body: { id },
            } = await detectionsApi
              .createRule({
                body: getCustomQueryRuleParams({
                  ...getRuleForAlertTesting([EVENTS_INDEX_NAME]),
                }),
              })
              .expect(200);

            await waitForRuleSuccess({
              supertest,
              log,
              id,
            });
            await waitForAlertsToBePresent(supertest, log, 2, [id]);
            const alertsResponse = await getAlertsByIds(supertest, log, [id]);
            const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
            const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

            expect(alertsOrderedByEventId).toHaveLength(2);
          });

          describe('with timestamp override', () => {
            it('expects partial failure when matching events have the timestamp override field missing', async () => {
              await ingestEvents({
                es,
                indexName: EVENTS_INDEX_NAME,
                events: [EVENT_DOC_WITHOUT_TIMESTAMPS, EVENT_DOC_WITH_DEFAULT_TIMESTAMP],
              });

              const {
                body: { id },
              } = await detectionsApi
                .createRule({
                  body: getCustomQueryRuleParams({
                    index: [EVENTS_INDEX_NAME],
                    timestamp_override: 'event.ingested',
                    enabled: true,
                  }),
                })
                .expect(200);

              await waitForAlertToComplete(supertest, log, id);
              await waitForRulePartialFailure({
                supertest,
                log,
                id,
              });

              const { body: rule } = await detectionsApi
                .readRule({
                  query: { id },
                })
                .expect(200);

              expect(rule?.execution_summary?.last_execution.status).toEqual('partial failure');
              expect(rule?.execution_summary?.last_execution.message).toEqual(
                `The following indices are missing the timestamp override field "event.ingested": ["${EVENTS_INDEX_NAME}"]`
              );
            });

            it('generates alerts for events having the default timestamp field but missing the timestamp override field', async () => {
              await ingestEvents({
                es,
                indexName: EVENTS_INDEX_NAME,
                events: [
                  EVENT_DOC_WITHOUT_TIMESTAMPS,
                  EVENT_DOC_WITH_DEFAULT_TIMESTAMP,
                  EVENT_DOC_WITH_CUSTOM_TIMESTAMP,
                  EVENT_DOC_WITH_BOTH_TIMESTAMPS,
                ],
              });

              const {
                body: { id },
              } = await detectionsApi
                .createRule({
                  body: getCustomQueryRuleParams({
                    ...getRuleForAlertTesting([EVENTS_INDEX_NAME]),
                    timestamp_override: 'event.non-existent-field',
                  }),
                })
                .expect(200);

              await waitForRulePartialFailure({
                supertest,
                log,
                id,
              });
              await waitForAlertsToBePresent(supertest, log, 2, [id]);
              const alertsResponse = await getAlertsByIds(supertest, log, [id, id]);
              const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
              const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

              expect(alertsOrderedByEventId).toHaveLength(2);
            });

            it('generates alerts for events having the default timestamp field, override timestamp field and both timestamps fields', async () => {
              await ingestEvents({
                es,
                indexName: EVENTS_INDEX_NAME,
                events: [
                  EVENT_DOC_WITHOUT_TIMESTAMPS,
                  EVENT_DOC_WITH_DEFAULT_TIMESTAMP,
                  EVENT_DOC_WITH_CUSTOM_TIMESTAMP,
                  EVENT_DOC_WITH_BOTH_TIMESTAMPS,
                ],
              });

              const {
                body: { id },
              } = await detectionsApi
                .createRule({
                  body: getCustomQueryRuleParams({
                    ...getRuleForAlertTesting([EVENTS_INDEX_NAME]),
                    timestamp_override: 'event.ingested',
                  }),
                })
                .expect(200);

              await waitForRuleSuccess({
                supertest,
                log,
                id,
              });
              await waitForAlertsToBePresent(supertest, log, 3, [id]);
              const alertsResponse = await getAlertsByIds(supertest, log, [id], 3);
              const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
              const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

              expect(alertsOrderedByEventId).toHaveLength(3);
            });

            /**
             * We should not use the timestamp override as the "original_time" as that can cause
             * confusion if you have both a timestamp and an override in the source event. Instead the "original_time"
             * field should only be overridden by the "timestamp" since when we generate a alert
             * and we add a new timestamp to the alert.
             */
            it('does NOT use the timestamp override as the "original_time"', async () => {
              await ingestEvents({
                es,
                indexName: EVENTS_INDEX_NAME,
                events: [EVENT_DOC_WITH_CUSTOM_TIMESTAMP],
              });

              const {
                body: { id },
              } = await detectionsApi
                .createRule({
                  body: getCustomQueryRuleParams({
                    ...getRuleForAlertTesting([EVENTS_INDEX_NAME]),
                    timestamp_override: 'event.ingested',
                  }),
                })
                .expect(200);

              await waitForRuleSuccess({ supertest, log, id });
              await waitForAlertsToBePresent(supertest, log, 1, [id]);
              const alertsResponse = await getAlertsByIds(supertest, log, [id, id]);
              const hits = alertsResponse.hits.hits
                .map((hit) => hit._source?.[ALERT_ORIGINAL_TIME])
                .sort();
              expect(hits).toEqual([undefined]);
            });
          });
        });

        describe('timestamp fallback is disabled', () => {
          describe('with timestamp override', () => {
            it('generates alerts only for events having override timestamp field', async () => {
              await ingestEvents({
                es,
                indexName: EVENTS_INDEX_NAME,
                events: [
                  EVENT_DOC_WITHOUT_TIMESTAMPS,
                  EVENT_DOC_WITH_DEFAULT_TIMESTAMP,
                  EVENT_DOC_WITH_CUSTOM_TIMESTAMP,
                  EVENT_DOC_WITH_BOTH_TIMESTAMPS,
                ],
              });

              const {
                body: { id },
              } = await detectionsApi
                .createRule({
                  body: getCustomQueryRuleParams({
                    ...getRuleForAlertTesting([EVENTS_INDEX_NAME]),
                    rule_id: 'rule-without-timestamp-fallback',
                    timestamp_override: 'event.ingested',
                    timestamp_override_fallback_disabled: true,
                  }),
                })
                .expect(200);

              await waitForRuleSuccess({
                supertest,
                log,
                id,
              });
              await waitForAlertsToBePresent(supertest, log, 2, [id]);
              const alertsResponse = await getAlertsByIds(supertest, log, [id], 2);
              const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
              const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

              expect(alertsOrderedByEventId).toHaveLength(2);
            });

            it('does NOT generate any alerts for events missing timestamp override field', async () => {
              await ingestEvents({
                es,
                indexName: EVENTS_INDEX_NAME,
                events: [
                  EVENT_DOC_WITHOUT_TIMESTAMPS,
                  EVENT_DOC_WITH_DEFAULT_TIMESTAMP,
                  EVENT_DOC_WITH_CUSTOM_TIMESTAMP,
                  EVENT_DOC_WITH_BOTH_TIMESTAMPS,
                ],
              });

              const { body: createdRule } = await detectionsApi
                .createRule({
                  body: getCustomQueryRuleParams({
                    ...getRuleForAlertTesting([EVENTS_INDEX_NAME]),
                    rule_id: 'rule-without-timestamp-fallback',
                    timestamp_override: 'event.fakeingestfield',
                    timestamp_override_fallback_disabled: true,
                  }),
                })
                .expect(200);

              const alertsOpen = await getAlerts(
                supertest,
                log,
                es,
                createdRule,
                RuleExecutionStatusEnum['partial failure']
              );
              expect(alertsOpen.hits.hits).toHaveLength(0);
            });
          });
        });
      });

      describe('EQL', () => {
        describe('timestamp fallback is enabled', () => {
          it('generates alerts for events having the default timestamp field', async () => {
            await ingestEvents({
              es,
              indexName: EVENTS_INDEX_NAME,
              events: [
                EVENT_DOC_WITHOUT_TIMESTAMPS,
                EVENT_DOC_WITH_DEFAULT_TIMESTAMP,
                EVENT_DOC_WITH_CUSTOM_TIMESTAMP,
                EVENT_DOC_WITH_BOTH_TIMESTAMPS,
              ],
            });

            const {
              body: { id },
            } = await detectionsApi
              .createRule({
                body: getEqlRuleForAlertTesting([EVENTS_INDEX_NAME]),
              })
              .expect(200);

            await waitForRuleSuccess({
              supertest,
              log,
              id,
            });
            await waitForAlertsToBePresent(supertest, log, 2, [id]);
            const alertsResponse = await getAlertsByIds(supertest, log, [id]);
            const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
            const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

            expect(alertsOrderedByEventId).toHaveLength(2);
          });

          it('generates alerts for events having the default timestamp field and missing timestamp override field', async () => {
            await ingestEvents({
              es,
              indexName: EVENTS_INDEX_NAME,
              events: [
                EVENT_DOC_WITHOUT_TIMESTAMPS,
                EVENT_DOC_WITH_DEFAULT_TIMESTAMP,
                EVENT_DOC_WITH_CUSTOM_TIMESTAMP,
                EVENT_DOC_WITH_BOTH_TIMESTAMPS,
              ],
            });

            const {
              body: { id },
            } = await detectionsApi
              .createRule({
                body: {
                  ...getEqlRuleForAlertTesting([EVENTS_INDEX_NAME]),
                  timestamp_override: 'event.non-existent-field',
                },
              })
              .expect(200);

            await waitForRulePartialFailure({
              supertest,
              log,
              id,
            });
            await waitForAlertsToBePresent(supertest, log, 2, [id]);
            const alertsResponse = await getAlertsByIds(supertest, log, [id, id]);
            const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
            const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

            expect(alertsOrderedByEventId).toHaveLength(2);
          });
        });

        describe('timestamp fallback is disabled', () => {
          it('does NOT generate any alerts for events missing timestamp override field', async () => {
            await ingestEvents({
              es,
              indexName: EVENTS_INDEX_NAME,
              events: [
                EVENT_DOC_WITHOUT_TIMESTAMPS,
                EVENT_DOC_WITH_DEFAULT_TIMESTAMP,
                EVENT_DOC_WITH_CUSTOM_TIMESTAMP,
                EVENT_DOC_WITH_BOTH_TIMESTAMPS,
              ],
            });

            const { body: createdRule } = await detectionsApi
              .createRule({
                body: {
                  ...getEqlRuleForAlertTesting([EVENTS_INDEX_NAME]),
                  timestamp_override: 'event.non-existent-field',
                  timestamp_override_fallback_disabled: true,
                },
              })
              .expect(200);

            const alertsOpen = await getAlerts(
              supertest,
              log,
              es,
              createdRule,
              RuleExecutionStatusEnum['partial failure']
            );
            expect(alertsOpen.hits.hits).toHaveLength(0);
          });
        });
      });
    });

    describe('alerts generated from events with timestamp override field and ensures search_after continues to work when documents are missing timestamp override field', () => {
      before(async () => {
        await esArchiver.load(path);
      });

      after(async () => {
        await esArchiver.unload(path);
      });

      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      describe('KQL', () => {
        /**
         * This represents our worst case scenario where this field is not mapped on any index
         * We want to check that our logic continues to function within the constraints of search after
         * Elasticsearch returns java's long.MAX_VALUE for unmapped date fields
         * Javascript does not support numbers this large, but without passing in a number of this size
         * The search_after will continue to return the same results and not iterate to the next set
         * So to circumvent this limitation of javascript we return the stringified version of Java's
         * Long.MAX_VALUE so that search_after does not enter into an infinite loop.
         *
         * ref: https://github.com/elastic/elasticsearch/issues/28806#issuecomment-369303620
         */
        it('should generate 200 alerts when timestamp override does not exist', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            timestamp_override: 'event.fakeingested',
            max_signals: 200,
          };

          const { id } = await createRule(supertest, log, rule);
          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          await waitForAlertsToBePresent(supertest, log, 200, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id], 200);
          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);

          expect(alerts).toHaveLength(200);
        });
      });
    });
  });
};

interface IngestEventsParams {
  es: Client;
  indexName: string;
  events: Array<Record<string, unknown>>;
}

async function ingestEvents({ es, indexName, events }: IngestEventsParams) {
  await es.indices.delete({ index: indexName, ignore_unavailable: true });
  await es.indices.create({
    index: indexName,
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
        },
      },
    },
  });

  await es.bulk({
    index: indexName,
    refresh: true,
    operations: events.flatMap((eventDoc) => [{ create: {} }, eventDoc]),
  });
}
