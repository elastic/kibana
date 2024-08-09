/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';

import { MachineLearningRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { Anomaly } from '@kbn/security-solution-plugin/server/lib/machine_learning';
import { ALERT_SUPPRESSION_DOCS_COUNT } from '@kbn/rule-data-utils';
import moment from 'moment';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  dataGeneratorFactory,
  executeSetupModuleRequest,
  forceStartDatafeeds,
  getAlerts,
  scheduleRuleRun,
  stopAllManualRuns,
  waitForBackfillExecuted,
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

  const { indexListOfDocuments } = dataGeneratorFactory({
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
  const baseAnomaly: Partial<Anomaly> = {
    is_interim: false,
    record_score: 43, // exceeds anomaly_threshold above
    result_type: 'record',
    job_id: mlJobId,
    'user.name': ['root'],
  };

  describe('@ess @serverless @skipInServerlessMKI Machine Learning Detection Rule - Manual rule run', () => {
    before(async () => {
      // Order is critical here: auditbeat data must be loaded before attempting to start the ML job,
      // as the job looks for certain indices on start
      await esArchiver.load(auditbeatArchivePath);
      await executeSetupModuleRequest({ module: mlModuleName, rspCode: 200, supertest });
      await forceStartDatafeeds({ jobId: mlJobId, rspCode: 200, supertest });
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/anomalies');
      await deleteAllAnomalies(log, es);
      await stopAllManualRuns(supertest);
    });

    after(async () => {
      await esArchiver.load(auditbeatArchivePath);
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/anomalies');
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    afterEach(async () => {
      await stopAllManualRuns(supertest);
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await deleteAllAnomalies(log, es);
    });

    describe('with interval suppression duration', () => {
      it('alerts when run on a time range that the rule has not previously seen, and deduplicates if run there more than once', async () => {
        const firstTimestamp = moment(new Date()).subtract(3, 'h');

        await indexListOfDocuments([
          {
            ...baseAnomaly,
            timestamp: firstTimestamp.toISOString(),
          },
          {
            ...baseAnomaly,
            timestamp: new Date().toISOString(),
          },
        ]);
        const rule = {
          ...baseRuleProps,
          from: 'now-1h',
          interval: '1h',
        };
        const createdRule = await createRule(supertest, log, rule);
        const alerts = await getAlerts(supertest, log, es, createdRule);

        expect(alerts.hits.hits).toHaveLength(1);
        const backfill = await scheduleRuleRun(supertest, [createdRule.id], {
          startDate: moment(firstTimestamp).subtract(5, 'm'),
          endDate: moment(firstTimestamp).add(5, 'm'),
        });

        await waitForBackfillExecuted(backfill, [createdRule.id], { supertest, log });
        const allNewAlerts = await getAlerts(supertest, log, es, createdRule);
        expect(allNewAlerts.hits.hits).toHaveLength(2);

        const secondBackfill = await scheduleRuleRun(supertest, [createdRule.id], {
          startDate: moment(firstTimestamp).subtract(5, 'm'),
          endDate: moment(firstTimestamp).add(5, 'm'),
        });

        await waitForBackfillExecuted(secondBackfill, [createdRule.id], { supertest, log });
        const allNewAlertsAfter2ManualRuns = await getAlerts(supertest, log, es, createdRule);
        expect(allNewAlertsAfter2ManualRuns.hits.hits.length).toEqual(2);
      });

      it('does not alert if the manual run overlaps with a previous scheduled rule execution', async () => {
        const firstTimestamp = moment(new Date());

        await indexListOfDocuments([
          {
            ...baseAnomaly,
            timestamp: firstTimestamp.toISOString(),
          },
        ]);

        const rule = {
          ...baseRuleProps,
          from: 'now-1h',
          interval: '1h',
        };

        const createdRule = await createRule(supertest, log, rule);
        const alerts = await getAlerts(supertest, log, es, createdRule);

        expect(alerts.hits.hits).toHaveLength(1);

        const backfill = await scheduleRuleRun(supertest, [createdRule.id], {
          startDate: moment(firstTimestamp).subtract(5, 'm'),
          endDate: moment(),
        });

        await waitForBackfillExecuted(backfill, [createdRule.id], { supertest, log });
        const allNewAlerts = await getAlerts(supertest, log, es, createdRule);
        expect(allNewAlerts.hits.hits).toHaveLength(1);
      });

      it('supression per rule execution should work for manual rule runs', async () => {
        const firstTimestamp = moment(new Date()).subtract(3, 'h');

        await indexListOfDocuments([
          {
            ...baseAnomaly,
            timestamp: firstTimestamp.toISOString(),
          },

          {
            ...baseAnomaly,
            timestamp: moment(firstTimestamp).add(1, 'm').toISOString(),
          },
          {
            ...baseAnomaly,
            timestamp: moment(firstTimestamp).add(3, 'm').toISOString(),
          },
        ]);

        const rule = {
          ...baseRuleProps,
          from: 'now-35m',
          interval: '30m',
          alert_suppression: {
            group_by: ['user.name'],
          },
        };

        const createdRule = await createRule(supertest, log, rule);
        const alerts = await getAlerts(supertest, log, es, createdRule);

        expect(alerts.hits.hits).toHaveLength(0);

        const backfill = await scheduleRuleRun(supertest, [createdRule.id], {
          startDate: moment(firstTimestamp).subtract(5, 'm'),
          endDate: moment(firstTimestamp).add(10, 'm'),
        });

        await waitForBackfillExecuted(backfill, [createdRule.id], { supertest, log });
        const allNewAlerts = await getAlerts(supertest, log, es, createdRule);
        expect(allNewAlerts.hits.hits).toHaveLength(1);
      });

      it('supression with time window should work for manual rule runs and update alert', async () => {
        const firstTimestamp = moment(new Date()).subtract(3, 'h');

        await indexListOfDocuments([
          {
            ...baseAnomaly,
            timestamp: firstTimestamp.toISOString(),
          },
        ]);

        const rule: MachineLearningRuleCreateProps = {
          ...baseRuleProps,
          from: 'now-35m',
          interval: '30m',
          alert_suppression: {
            group_by: ['user.name'],
            duration: {
              value: 500,
              unit: 'm',
            },
          },
        };

        const createdRule = await createRule(supertest, log, rule);
        const alerts = await getAlerts(supertest, log, es, createdRule);

        expect(alerts.hits.hits).toHaveLength(0);

        // generate alert in the past
        const backfill = await scheduleRuleRun(supertest, [createdRule.id], {
          startDate: moment(firstTimestamp).subtract(5, 'm'),
          endDate: moment(firstTimestamp).add(5, 'm'),
        });

        await waitForBackfillExecuted(backfill, [createdRule.id], { supertest, log });
        const allNewAlerts = await getAlerts(supertest, log, es, createdRule);
        expect(allNewAlerts.hits.hits).toHaveLength(1);

        // now we will ingest new event, and manual rule run should update original alert

        await indexListOfDocuments([
          {
            ...baseAnomaly,
            timestamp: moment(firstTimestamp).add(40, 'm').toISOString(),
          },
        ]);

        const secondBackfill = await scheduleRuleRun(supertest, [createdRule.id], {
          startDate: moment(firstTimestamp).add(39, 'm'),
          endDate: moment(firstTimestamp).add(120, 'm'),
        });

        await waitForBackfillExecuted(secondBackfill, [createdRule.id], { supertest, log });
        const updatedAlerts = await getAlerts(supertest, log, es, createdRule);
        expect(updatedAlerts.hits.hits).toHaveLength(1);

        expect(updatedAlerts.hits.hits).toHaveLength(1);
        expect(updatedAlerts.hits.hits[0]._source).toEqual({
          ...updatedAlerts.hits.hits[0]._source,
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
        });
      });
    });
  });
};
