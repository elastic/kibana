/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// WARNING: This test running in Function Test Runner is building a live
// LifecycleRuleExecutor, feeding it some mock data, but letting it write
// it's various alerts to indices.  I suspect it's quite fragile, and I
// added this comment to fix some fragility in the way the alert factory
// was built.  I suspect it will suffer more such things in the future.
// I fixed this as a drive-by, but opened an issue to do something later,
// if needed: https://github.com/elastic/kibana/issues/144557

import { type Subject, ReplaySubject } from 'rxjs';
import type { ElasticsearchClient, Logger, LogMeta } from '@kbn/core/server';
import sinon from 'sinon';
import expect from '@kbn/expect';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import {
  AlertConsumers,
  ALERT_REASON,
  ALERT_UUID,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import {
  createLifecycleExecutor,
  WrappedLifecycleRuleState,
} from '@kbn/rule-registry-plugin/server/utils/create_lifecycle_executor';
import { Dataset, IRuleDataClient, RuleDataService } from '@kbn/rule-registry-plugin/server';
import { RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { getDataStreamAdapter } from '@kbn/alerting-plugin/server/alerts_service/lib/data_stream_adapter';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  MockRuleParams,
  MockRuleState,
  MockAlertContext,
  MockAlertState,
  MockAllowedActionGroups,
} from '../../../common/types';
import { cleanupRegistryIndices, getMockAlertFactory } from '../../../common/lib/helpers';

// eslint-disable-next-line import/no-default-export
export default function createLifecycleExecutorApiTest({ getService }: FtrProviderContext) {
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

  const dataStreamAdapter = getDataStreamAdapter({ useDataStreamForAlerts: false });

  describe('createLifecycleExecutor', () => {
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
        frameworkAlerts: {
          enabled: () => false,
          getContextInitializationPromise: async () => ({ result: false }),
        },
        pluginStop$,
        dataStreamAdapter,
      });

      // This initializes the service. This happens immediately after the creation
      // of the RuleDataService in the setup phase of the Rule Registry plugin
      ruleDataService.initializeService();

      // This initializes the index and templates and returns the data client.
      // This happens in each solution plugin before they can register lifecycle
      // executors.
      ruleDataClient = ruleDataService.initializeIndex({
        feature: AlertConsumers.OBSERVABILITY,
        registrationContext: 'observability.test',
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

    it('should work with object fields', async () => {
      const id = 'host-01';

      // This creates the function that will wrap the solution's rule executor with the RuleRegistry lifecycle
      const createLifecycleRuleExecutor = createLifecycleExecutor(logger, ruleDataClient);

      // This creates the executor that is passed to the Alerting framework.
      const executor = createLifecycleRuleExecutor<
        MockRuleParams,
        MockRuleState,
        MockAlertState,
        MockAlertContext,
        MockAllowedActionGroups
      >(async function (options) {
        const { services, state: previousState } = options;
        const { alertWithLifecycle } = services;

        // Fake some state updates
        const state = previousState.testObject
          ? {
              ...previousState,
              testObject: {
                ...previousState.testObject,
                values: [
                  ...previousState.testObject.values,
                  { name: 'count', value: previousState.testObject.values.length + 1 },
                ],
              },
            }
          : {
              ...previousState,
              testObject: {
                id,
                values: [{ name: 'count', value: 1 }],
                host: {
                  name: id,
                },
              },
            };

        // This MUST be called by the solutions executor function
        alertWithLifecycle({
          id,
          fields: {
            [ALERT_REASON]: 'Test alert is firing',
            ...state,
          },
        });

        // Returns the current state of the alert
        return Promise.resolve({ state });
      });

      const ruleId = 'rule-id';
      // Create the options with the minimal amount of values to test the lifecycle executor
      const options = {
        alertId: ruleId,
        spaceId: 'default',
        tags: ['test'],
        startedAt: new Date(),
        rule: {
          id: ruleId,
          name: 'test rule',
          ruleTypeId: 'observability.test.fake',
          ruleTypeName: 'test',
          consumer: 'observability',
          producer: 'observability.test',
        },
        services: {
          alertFactory: getMockAlertFactory(),
          shouldWriteAlerts: sinon.stub().returns(true),
        },
        flappingSettings: {
          enabled: false,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        },
        dataStreamAdapter,
      } as unknown as RuleExecutorOptions<
        MockRuleParams,
        WrappedLifecycleRuleState<MockRuleState>,
        { [x: string]: unknown },
        { [x: string]: unknown },
        string
      >;

      // Execute the rule the first time
      const executorResult = await executor(options);
      expect(executorResult.state.wrapped).to.eql({
        testObject: {
          host: { name: 'host-01' },
          id: 'host-01',
          values: [{ name: 'count', value: 1 }],
        },
      });

      const alertUuid = executorResult.state.trackedAlerts['host-01'].alertUuid;
      expect(alertUuid).to.be('uuid-1');

      // We need to refresh the index so the data is available for the next call
      await es.indices.refresh({ index: `${ruleDataClient.indexName}*` });

      // Execute again to ensure that we read the object and write it again with the updated state
      const nextExecutorResult = await executor({ ...options, state: executorResult.state });
      expect(nextExecutorResult.state.wrapped).to.eql({
        testObject: {
          host: { name: 'host-01' },
          id: 'host-01',
          values: [
            { name: 'count', value: 1 },
            { name: 'count', value: 2 },
          ],
        },
      });

      // Refresh again so we can query the data to check it was written properly
      await es.indices.refresh({ index: `${ruleDataClient.indexName}*` });

      // Use the ruleDataClient to read the results from the index
      const response = await ruleDataClient.getReader().search({
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    [ALERT_UUID]: nextExecutorResult.state.trackedAlerts['host-01'].alertUuid,
                  },
                },
              ],
            },
          },
        },
      });
      const source = response.hits.hits[0]._source as any;

      // The state in Elasticsearch should match the state returned from the executor
      expect(source.testObject).to.eql(
        nextExecutorResult.state.wrapped && nextExecutorResult.state.wrapped.testObject
      );
    });
  });
}
