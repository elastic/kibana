/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertestLib from 'supertest';
import url from 'url';

import { MachineLearningRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ALERT_SUPPRESSION_DOCS_COUNT, ALERT_SUPPRESSION_TERMS } from '@kbn/rule-data-utils';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { executeSetupModuleRequest, forceStartDatafeeds, getAlerts } from '../../../../utils';
import {
  createRule,
  deleteAllAlerts,
  deleteAllRules,
} from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const config = getService('config');
  const retry = getService('retry');

  const request = supertestLib(url.format(config.get('servers.kibana')));
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatArchivePath = dataPathBuilder.getPath('auditbeat/hosts');

  const mlModuleName = 'security_linux_v3';
  const mlJobId = 'v3_linux_anomalous_network_activity';
  const baseRuleProps: MachineLearningRuleCreateProps = {
    name: 'Test ML rule',
    description: 'Test ML rule description',
    risk_score: 50,
    severity: 'critical',
    type: 'machine_learning',
    anomaly_threshold: 30,
    machine_learning_job_id: mlJobId,
    from: '1900-01-01T00:00:00.000Z',
    rule_id: 'ml-rule-id',
  };
  let ruleProps: MachineLearningRuleCreateProps;

  // TODO: feature flag
  describe('@ess @serverless @serverlessQA Machine Learning Detection Rule - Alert Suppression', () => {
    describe('with anomalies available to be alerted upon', () => {
      before(async () => {
        // Order is critical here: auditbeat data must be loaded before attempting to start the ML job,
        // as the job looks for certain indices on start
        await esArchiver.load(auditbeatArchivePath);
        await executeSetupModuleRequest({ module: mlModuleName, rspCode: 200, supertest });
        await forceStartDatafeeds({ jobId: mlJobId, rspCode: 200, supertest });
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/anomalies');
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
      });

      describe('with per-execution suppression duration', () => {
        beforeEach(async () => {
          ruleProps = {
            ...baseRuleProps,
            alert_suppression: {
              group_by: ['user.name'],
              missing_fields_strategy: 'suppress',
            },
          };
        });

        it.only('suppresses alerts within a single execution', async () => {
          const createdRule = await createRule(supertest, log, ruleProps);
          const alerts = await getAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);
          expect(alerts.hits.hits[0]._source).toEqual(
            expect.objectContaining({
              [ALERT_SUPPRESSION_TERMS]: { field: 'user.name', value: ['root'] },
              [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
            })
          );
        });

        it.skip('suppresses alerts in multiple executions');
        it.skip('suppresses alerts with timestamp override configured');
        it.skip(
          'deduplicates previously suppressed alerts if rule has overlapping execution windows'
        );
        it.skip('performs no suppression if a single alert is generated');
      });

      describe('with interval suppression duration', () => {
        it.skip('performs no suppression if a single alert is generated');
        it.skip('suppresses alerts across two executions');
        it.skip('suppresses alerts across three executions');
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
