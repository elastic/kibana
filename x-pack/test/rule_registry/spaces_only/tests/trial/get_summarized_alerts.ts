/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subject, ReplaySubject } from 'rxjs';
import type { ElasticsearchClient, Logger, LogMeta } from '@kbn/core/server';
import sinon from 'sinon';
import { v4 as uuid } from 'uuid';
import expect from '@kbn/expect';
import { mappingFromFieldMap } from '@kbn/rule-registry-plugin/common/mapping_from_field_map';
import {
  AlertConsumers,
  ALERT_REASON,
  ALERT_INSTANCE_ID,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import {
  createLifecycleExecutor,
  TrackedLifecycleAlertState,
  WrappedLifecycleRuleState,
} from '@kbn/rule-registry-plugin/server/utils/create_lifecycle_executor';
import {
  createGetSummarizedAlertsFn,
  Dataset,
  IRuleDataClient,
  RuleDataService,
} from '@kbn/rule-registry-plugin/server';
import { RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { get } from 'lodash';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  MockRuleParams,
  MockAlertContext,
  MockAlertState,
  MockAllowedActionGroups,
} from '../../../common/types';
import { cleanupRegistryIndices } from '../../../common/lib/helpers/cleanup_registry_indices';

// eslint-disable-next-line import/no-default-export
export default function createGetSummarizedAlertsTest({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');

  const fakeLogger = <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
    meta ? log.debug(msg, meta) : log.debug(msg);

  const logger = {
    trace: fakeLogger,
    debug: fakeLogger,
    info: fakeLogger,
    warn: fakeLogger,
    error: fakeLogger,
    fatal: fakeLogger,
    log: sinon.stub(),
    get: sinon.stub(),
    isLevelEnabled: sinon.stub(),
  } as Logger;

  const getClusterClient = () => {
    const client = es as ElasticsearchClient;
    return Promise.resolve(client);
  };

  describe('getSummarizedAlerts', () => {
    let ruleDataClient: IRuleDataClient;
    let pluginStop$: Subject<void>;

    before(async () => {
      // First we need to setup the data service. This happens within the
      // Rule Registry plugin as part of the server side setup phase.
      pluginStop$ = new ReplaySubject(1);

      const ruleDataService = new RuleDataService({
        getClusterClient,
        logger,
        kibanaVersion: '8.0.0',
        isWriteEnabled: true,
        isWriterCacheEnabled: false,
        disabledRegistrationContexts: [] as string[],
        pluginStop$,
      });

      // This initializes the service. This happens immediately after the creation
      // of the RuleDataService in the setup phase of the Rule Registry plugin
      ruleDataService.initializeService();

      // This initializes the index and templates and returns the data client.
      // This happens in each solution plugin before they can register lifecycle
      // executors.
      ruleDataClient = ruleDataService.initializeIndex({
        feature: AlertConsumers.OBSERVABILITY,
        registrationContext: 'observability.test.alerts',
        dataset: Dataset.alerts,
        componentTemplateRefs: [],
        componentTemplates: [
          {
            name: 'mappings',
            mappings: mappingFromFieldMap(
              {
                testObject: {
                  type: 'object',
                  required: false,
                  array: false,
                },
              },
              false
            ),
          },
        ],
      });
    });

    after(async () => {
      cleanupRegistryIndices(getService, ruleDataClient);
      pluginStop$.next();
      pluginStop$.complete();
    });

    it('should return new, ongoing and recovered alerts', async () => {
      const id = 'host-01';

      // This creates the function that will wrap the solution's rule executor with the RuleRegistry lifecycle
      const createLifecycleRuleExecutor = createLifecycleExecutor(logger, ruleDataClient);
      const createGetSummarizedAlerts = createGetSummarizedAlertsFn({
        ruleDataClient,
        useNamespace: false,
        isLifecycleAlert: true,
      });

      // This creates the executor that is passed to the Alerting framework.
      const executor = createLifecycleRuleExecutor<
        MockRuleParams,
        { shouldTriggerAlert: boolean },
        MockAlertState,
        MockAlertContext,
        MockAllowedActionGroups
      >(async function (options) {
        const { services, state: previousState } = options;
        const { alertWithLifecycle } = services;

        const triggerAlert = previousState.shouldTriggerAlert;

        if (triggerAlert) {
          alertWithLifecycle({
            id,
            fields: {
              [ALERT_REASON]: 'Test alert is firing',
            },
          });
        }

        return Promise.resolve({ state: { shouldTriggerAlert: triggerAlert } });
      });

      const getSummarizedAlerts = createGetSummarizedAlerts();

      // Create the options with the minimal amount of values to test the lifecycle executor
      const options = {
        spaceId: 'default',
        rule: {
          id,
          name: 'test rule',
          ruleTypeId: 'observability.test.fake',
          ruleTypeName: 'test',
          consumer: 'observability',
          producer: 'observability.test',
        },
        services: {
          alertFactory: { create: sinon.stub() },
          shouldWriteAlerts: sinon.stub().returns(true),
        },
      } as unknown as RuleExecutorOptions<
        MockRuleParams,
        WrappedLifecycleRuleState<{ shouldTriggerAlert: boolean }>,
        { [x: string]: unknown },
        { [x: string]: unknown },
        string
      >;

      const getState = (
        shouldTriggerAlert: boolean,
        alerts: Record<string, TrackedLifecycleAlertState>
      ) => ({ wrapped: { shouldTriggerAlert }, trackedAlerts: alerts, trackedAlertsRecovered: {} });

      // Execute the rule the first time - this creates a new alert
      const preExecution1Start = new Date();
      const execution1Uuid = uuid.v4();
      const execution1Result = await executor({
        ...options,
        startedAt: new Date(),
        state: getState(true, {}),
        executionId: execution1Uuid,
      });

      const execution1SummarizedAlerts = await getSummarizedAlerts({
        ruleId: id,
        executionUuid: execution1Uuid,
        spaceId: 'default',
        excludedAlertInstanceIds: [],
      });
      expect(execution1SummarizedAlerts.new.count).to.eql(1);
      expect(execution1SummarizedAlerts.ongoing.count).to.eql(0);
      expect(execution1SummarizedAlerts.recovered.count).to.eql(0);

      // Execute again to update the existing alert
      const preExecution2Start = new Date();
      const execution2Uuid = uuid.v4();
      const execution2Result = await executor({
        ...options,
        startedAt: new Date(),
        state: getState(true, execution1Result.state.trackedAlerts),
        executionId: execution2Uuid,
      });

      const execution2SummarizedAlerts = await getSummarizedAlerts({
        ruleId: id,
        executionUuid: execution2Uuid,
        spaceId: 'default',
        excludedAlertInstanceIds: [],
      });
      expect(execution2SummarizedAlerts.new.count).to.eql(0);
      expect(execution2SummarizedAlerts.ongoing.count).to.eql(1);
      expect(execution2SummarizedAlerts.recovered.count).to.eql(0);

      // Execute again to recover the alert
      const execution3Uuid = uuid.v4();
      await executor({
        ...options,
        startedAt: new Date(),
        state: getState(false, execution2Result.state.trackedAlerts),
        executionId: execution3Uuid,
      });

      const execution3SummarizedAlerts = await getSummarizedAlerts({
        ruleId: id,
        executionUuid: execution3Uuid,
        spaceId: 'default',
        excludedAlertInstanceIds: [],
      });
      expect(execution3SummarizedAlerts.new.count).to.eql(0);
      expect(execution3SummarizedAlerts.ongoing.count).to.eql(0);
      expect(execution3SummarizedAlerts.recovered.count).to.eql(1);

      // Get summarized alerts across all 3 executions
      // Should return the new and recovered alert but not count it as ongoing because
      // it triggered and recovered within the time range
      const timeRangeSummarizedAlerts1 = await getSummarizedAlerts({
        ruleId: id,
        start: preExecution1Start,
        end: new Date(),
        spaceId: 'default',
        excludedAlertInstanceIds: [],
      });
      expect(timeRangeSummarizedAlerts1.new.count).to.eql(1);
      expect(timeRangeSummarizedAlerts1.ongoing.count).to.eql(0);
      expect(timeRangeSummarizedAlerts1.recovered.count).to.eql(1);

      // Get summarized alerts across last 2 executions
      // Should return the recovered alert but not count it as new or ongoing because
      // it recovered before the time range
      const timeRangeSummarizedAlerts2 = await getSummarizedAlerts({
        ruleId: id,
        start: preExecution2Start,
        end: new Date(),
        spaceId: 'default',
        excludedAlertInstanceIds: [],
      });
      expect(timeRangeSummarizedAlerts2.new.count).to.eql(0);
      expect(timeRangeSummarizedAlerts2.ongoing.count).to.eql(0);
      expect(timeRangeSummarizedAlerts2.recovered.count).to.eql(1);
    });

    it(`shouldn't return muted alerts`, async () => {
      const ruleId = uuid.v4();
      const id1 = 'host-01';
      const id2 = 'host-02';

      // This creates the function that will wrap the solution's rule executor with the RuleRegistry lifecycle
      const createLifecycleRuleExecutor = createLifecycleExecutor(logger, ruleDataClient);
      const createGetSummarizedAlerts = createGetSummarizedAlertsFn({
        ruleDataClient,
        useNamespace: false,
        isLifecycleAlert: true,
      });

      // This creates the executor that is passed to the Alerting framework.
      const executor = createLifecycleRuleExecutor<
        MockRuleParams,
        {},
        MockAlertState,
        MockAlertContext,
        MockAllowedActionGroups
      >(async function (options) {
        const { services } = options;
        const { alertWithLifecycle } = services;

        alertWithLifecycle({
          id: id1,
          fields: {
            [ALERT_REASON]: 'Test alert is firing',
          },
        });
        alertWithLifecycle({
          id: id2,
          fields: {
            [ALERT_REASON]: 'Test alert is firing',
          },
        });

        return { state: {} };
      });

      const getSummarizedAlerts = createGetSummarizedAlerts();

      // Create the options with the minimal amount of values to test the lifecycle executor
      const options = {
        spaceId: 'default',
        rule: {
          id: ruleId,
          name: 'test rule',
          ruleTypeId: 'observability.test.fake',
          ruleTypeName: 'test',
          consumer: 'observability',
          producer: 'observability.test',
        },
        services: {
          alertFactory: { create: sinon.stub() },
          shouldWriteAlerts: sinon.stub().returns(true),
        },
      } as unknown as RuleExecutorOptions<
        MockRuleParams,
        WrappedLifecycleRuleState<{ shouldTriggerAlert: boolean }>,
        { [x: string]: unknown },
        { [x: string]: unknown },
        string
      >;

      const getState = (
        shouldTriggerAlert: boolean,
        alerts: Record<string, TrackedLifecycleAlertState>
      ) => ({ wrapped: { shouldTriggerAlert }, trackedAlerts: alerts, trackedAlertsRecovered: {} });

      // Execute the rule the first time - this creates a new alert
      const execution1Uuid = uuid.v4();
      await executor({
        ...options,
        startedAt: new Date(),
        state: getState(true, {}),
        executionId: execution1Uuid,
      });

      const summarizedAlertsExcludingId1 = await getSummarizedAlerts({
        ruleId,
        executionUuid: execution1Uuid,
        spaceId: 'default',
        excludedAlertInstanceIds: [id1],
      });
      expect(summarizedAlertsExcludingId1.new.count).to.eql(1);
      expect(summarizedAlertsExcludingId1.ongoing.count).to.eql(0);
      expect(summarizedAlertsExcludingId1.recovered.count).to.eql(0);
      expect(get(summarizedAlertsExcludingId1.new.data[0], ALERT_INSTANCE_ID)).to.eql(id2);

      const summarizedAlertsExcludingId2 = await getSummarizedAlerts({
        ruleId,
        executionUuid: execution1Uuid,
        spaceId: 'default',
        excludedAlertInstanceIds: [id2],
      });
      expect(summarizedAlertsExcludingId2.new.count).to.eql(1);
      expect(summarizedAlertsExcludingId2.ongoing.count).to.eql(0);
      expect(summarizedAlertsExcludingId2.recovered.count).to.eql(0);
      expect(get(summarizedAlertsExcludingId2.new.data[0], ALERT_INSTANCE_ID)).to.eql(id1);
    });
  });
}
