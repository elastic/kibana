/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';

import {
  MachineLearningRuleCreateProps,
  RuleExecutionStatusEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { Anomaly } from '@kbn/security-solution-plugin/server/lib/machine_learning';
import {
  ALERT_LAST_DETECTED,
  ALERT_START,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_TERMS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  dataGeneratorFactory,
  executeSetupModuleRequest,
  forceStartDatafeeds,
  getAlerts,
  getOpenAlerts,
  getPreviewAlerts,
  patchRule,
  previewRule,
} from '../../../../utils';
import {
  createRule,
  deleteAllAlerts,
  deleteAllAnomalies,
  deleteAllRules,
} from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const config = getService('config');

  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatArchivePath = dataPathBuilder.getPath('auditbeat/hosts');

  const { indexListOfDocuments, indexGeneratedDocuments } = dataGeneratorFactory({
    es,
    index: '.ml-anomalies-custom-v3_linux_anomalous_network_activity',
    log,
  });

  const mlModuleName = 'security_linux_v3';
  const mlJobId = 'v3_linux_anomalous_network_activity';
  const baseRuleProps: MachineLearningRuleCreateProps = {
    name: 'Test ML rule',
    description: 'Test ML rule description',
    risk_score: 50,
    severity: 'critical',
    type: 'machine_learning',
    anomaly_threshold: 40,
    machine_learning_job_id: mlJobId,
    from: '1900-01-01T00:00:00.000Z',
    rule_id: 'ml-rule-id',
  };
  let ruleProps: MachineLearningRuleCreateProps;
  const baseAnomaly: Partial<Anomaly> = {
    is_interim: false,
    record_score: 43, // exceeds anomaly_threshold above
    result_type: 'record',
    job_id: mlJobId,
    'user.name': ['root'],
  };

  // The tests described in this file rely on the 'alertSuppressionForMachineLearningRuleEnabled' feature flag
  describe('@ess @serverless @serverlessQA Machine Learning Detection Rule - Alert Suppression', () => {
    describe('with an active ML Job', () => {
      before(async () => {
        // Order is critical here: auditbeat data must be loaded before attempting to start the ML job,
        // as the job looks for certain indices on start
        await esArchiver.load(auditbeatArchivePath);
        await executeSetupModuleRequest({ module: mlModuleName, rspCode: 200, supertest });
        await forceStartDatafeeds({ jobId: mlJobId, rspCode: 200, supertest });
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/anomalies');
        await deleteAllAnomalies(supertest, log, es);
      });

      after(async () => {
        await esArchiver.load(auditbeatArchivePath);
        await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/anomalies');
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await deleteAllAnomalies(supertest, log, es);
      });

      describe('with per-execution suppression duration', () => {
        beforeEach(() => {
          ruleProps = {
            ...baseRuleProps,
            alert_suppression: {
              group_by: ['user.name'],
              missing_fields_strategy: 'suppress',
            },
          };
        });

        it('performs no suppression if a single alert is generated', async () => {
          const timestamp = new Date().toISOString();
          const anomaly = {
            ...baseAnomaly,
            timestamp,
          };
          await indexListOfDocuments([anomaly]);
          const createdRule = await createRule(supertest, log, ruleProps);
          const alerts = await getAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);
          expect(alerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [{ field: 'user.name', value: ['root'] }],
              [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
            })
          );
        });

        it('suppresses alerts within a single execution', async () => {
          const timestamp = new Date().toISOString();
          const anomaly = {
            ...baseAnomaly,
            timestamp,
          };
          await indexListOfDocuments([anomaly, anomaly]);

          const createdRule = await createRule(supertest, log, {
            ...ruleProps,
            from: timestamp,
          });

          const alerts = await getAlerts(supertest, log, es, createdRule);
          expect(alerts.hits.hits).toHaveLength(1);
          expect(alerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'user.name',
                  value: ['root'],
                },
              ],
              [ALERT_SUPPRESSION_START]: timestamp,
              [ALERT_SUPPRESSION_END]: timestamp,
              [ALERT_ORIGINAL_TIME]: timestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
            })
          );
        });

        it('deduplicates previously suppressed alerts if rule has overlapping execution windows', async () => {
          const firstTimestamp = new Date().toISOString();
          const firstAnomaly = {
            ...baseAnomaly,
            timestamp: firstTimestamp,
          };
          await indexListOfDocuments([firstAnomaly]);

          const createdRule = await createRule(supertest, log, {
            ...ruleProps,
            from: firstTimestamp,
          });
          const alerts = await getAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);
          expect(alerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'user.name',
                  value: ['root'],
                },
              ],
              // suppression boundaries equal to original event time, since no alert been suppressed
              [ALERT_SUPPRESSION_START]: firstTimestamp,
              [ALERT_SUPPRESSION_END]: firstTimestamp,
              [ALERT_ORIGINAL_TIME]: firstTimestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
            })
          );

          const secondTimestamp = new Date().toISOString();
          const secondAnomaly = {
            ...baseAnomaly,
            timestamp: secondTimestamp,
          };

          // Add more anomalies, then disable and re-enable to trigger another
          // rule run. The second anomaly should trigger an update to the
          // existing alert without changing the timestamp
          await indexListOfDocuments([secondAnomaly, secondAnomaly]);
          await patchRule(supertest, log, { id: createdRule.id, enabled: false });
          await patchRule(supertest, log, { id: createdRule.id, enabled: true });
          const secondAlerts = await getOpenAlerts(
            supertest,
            log,
            es,
            createdRule,
            RuleExecutionStatusEnum.succeeded,
            undefined,
            new Date()
          );

          expect(secondAlerts.hits.hits).toHaveLength(2);
          expect(secondAlerts.hits.hits[1]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'user.name',
                  value: ['root'],
                },
              ],
              [ALERT_ORIGINAL_TIME]: secondTimestamp,
              [ALERT_SUPPRESSION_START]: secondTimestamp,
              [ALERT_SUPPRESSION_END]: secondTimestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 1, // 1 of the two new anomalies was suppressed on this execution
            })
          );
        });
      });

      describe('with interval suppression duration', () => {
        beforeEach(() => {
          ruleProps = {
            ...baseRuleProps,
            alert_suppression: {
              duration: {
                value: 300,
                unit: 'm',
              },
              group_by: ['user.name'],
              missing_fields_strategy: 'suppress',
            },
          };
        });

        it('performs no suppression if a single alert is generated', async () => {
          const timestamp = new Date().toISOString();
          const anomaly = {
            ...baseAnomaly,
            timestamp,
          };
          await indexListOfDocuments([anomaly]);
          const createdRule = await createRule(supertest, log, ruleProps);
          const alerts = await getAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);
          expect(alerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [{ field: 'user.name', value: ['root'] }],
              [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
            })
          );
        });

        it('suppresses alerts across two executions', async () => {
          const firstTimestamp = new Date().toISOString();
          const firstAnomaly = {
            ...baseAnomaly,
            timestamp: firstTimestamp,
          };
          await indexListOfDocuments([firstAnomaly]);

          const createdRule = await createRule(supertest, log, {
            ...ruleProps,
            from: firstTimestamp,
          });
          const alerts = await getAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);
          expect(alerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'user.name',
                  value: ['root'],
                },
              ],
              // suppression boundaries equal to original event time, since no alert been suppressed
              [ALERT_SUPPRESSION_START]: firstTimestamp,
              [ALERT_SUPPRESSION_END]: firstTimestamp,
              [ALERT_ORIGINAL_TIME]: firstTimestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
            })
          );

          const secondTimestamp = new Date().toISOString();
          const secondAnomaly = {
            ...baseAnomaly,
            timestamp: secondTimestamp,
          };

          // Add more anomalies, then disable and re-enable to trigger another
          // rule run. The second anomaly should trigger an update to the
          // existing alert without changing the timestamp
          await indexListOfDocuments([secondAnomaly, secondAnomaly]);
          await patchRule(supertest, log, { id: createdRule.id, enabled: false });
          await patchRule(supertest, log, { id: createdRule.id, enabled: true });
          const secondAlerts = await getOpenAlerts(
            supertest,
            log,
            es,
            createdRule,
            RuleExecutionStatusEnum.succeeded,
            undefined,
            new Date()
          );

          expect(secondAlerts.hits.hits).toHaveLength(1);
          expect(secondAlerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: [
                {
                  field: 'user.name',
                  value: ['root'],
                },
              ],
              [ALERT_ORIGINAL_TIME]: firstTimestamp,
              [ALERT_SUPPRESSION_START]: firstTimestamp,
              [ALERT_SUPPRESSION_END]: secondTimestamp,
              [ALERT_SUPPRESSION_DOCS_COUNT]: 2, // 1 of the two new anomalies was suppressed on this execution
            })
          );
        });

        it('suppresses alerts across three executions', async () => {
          const firstTimestamp = '2020-10-28T05:45:00.000Z';
          const secondTimestamp = '2020-10-28T06:15:00.000Z';
          const thirdTimestamp = '2020-10-28T06:45:00.000Z';
          const laterTimestamp = '2020-10-28T07:00:00.000Z';
          const firstAnomaly = {
            ...baseAnomaly,
            timestamp: firstTimestamp,
          };
          const secondAnomaly = {
            ...baseAnomaly,
            timestamp: secondTimestamp,
          };
          const thirdAnomaly = {
            ...baseAnomaly,
            timestamp: thirdTimestamp,
          };

          await indexListOfDocuments([
            firstAnomaly,
            firstAnomaly,
            secondAnomaly,
            secondAnomaly,
            thirdAnomaly,
          ]);

          const rule = { ...ruleProps, interval: '30m' };
          const { previewId } = await previewRule({
            supertest,
            rule,
            timeframeEnd: new Date(laterTimestamp),
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
                field: 'user.name',
                value: ['root'],
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

        it.skip('suppresses alerts across multiple, sparse executions');
        it.skip('suppresses alerts on multiple fields');
        it.skip('suppresses only alerts that match suppression conditions');
        it.skip('does not suppress into a closed alert');
        it.skip('does not suppress into an unsuppressed alert');
        it.skip('does not suppress when the suppression interval is less than the rule interval');
        it.skip('suppresses alerts within a single execution');
        it.skip('suppresses alerts with timestamp override configured');
        it.skip(
          'deduplicates previously suppressed alerts if rule has overlapping execution windows'
        );
        it.skip('applies exceptions before suppression');
        it.skip('does not suppress alerts with missing fields, if not configured to do so');
        it.skip('suppresses alerts with missing fields, if configured to do so');
        it.skip('suppresses alerts with array field values');
      });
    });
  });
};
