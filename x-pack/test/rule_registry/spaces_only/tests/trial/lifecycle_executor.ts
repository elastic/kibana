/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, LogMeta } from 'kibana/server';
import sinon from 'sinon';
import expect from '@kbn/expect';
import { mappingFromFieldMap } from '../../../../../plugins/rule_registry/common/mapping_from_field_map';
import {
  AlertConsumers,
  ALERT_REASON,
  ALERT_UUID,
} from '../../../../../plugins/rule_registry/common/technical_rule_data_field_names';
import {
  createLifecycleExecutor,
  WrappedLifecycleRuleState,
} from '../../../../../plugins/rule_registry/server/utils/create_lifecycle_executor';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  Dataset,
  IRuleDataClient,
  RuleDataService,
} from '../../../../../plugins/rule_registry/server';
import {
  MockRuleParams,
  MockRuleState,
  MockAlertContext,
  MockAlertState,
  MockAllowedActionGroups,
} from '../../../common/types';
import { AlertExecutorOptions as RuleExecutorOptions } from '../../../../../plugins/alerting/server';
import { cleanupRegistryIndices } from '../../../common/lib/helpers/cleanup_registry_indices';

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
  } as Logger;

  const getClusterClient = () => {
    const client = es as ElasticsearchClient;
    return Promise.resolve(client);
  };

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/125851
  describe.skip('createLifecycleExecutor', () => {
    let ruleDataClient: IRuleDataClient;
    before(async () => {
      // First we need to setup the data service. This happens within the
      // Rule Registry plugin as part of the server side setup phase.
      const ruleDataService = new RuleDataService({
        getClusterClient,
        logger,
        kibanaVersion: '8.0.0',
        isWriteEnabled: true,
        isWriterCacheEnabled: false,
        disabledRegistrationContexts: [] as string[],
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
        return Promise.resolve(state);
      });

      // Create the options with the minimal amount of values to test the lifecycle executor
      const options = {
        alertId: id,
        spaceId: 'default',
        tags: ['test'],
        startedAt: new Date(),
        rule: {
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
        WrappedLifecycleRuleState<MockRuleState>,
        { [x: string]: unknown },
        { [x: string]: unknown },
        string
      >;

      // Execute the rule the first time
      const results = await executor(options);
      expect(results.wrapped).to.eql({
        testObject: {
          host: { name: 'host-01' },
          id: 'host-01',
          values: [{ name: 'count', value: 1 }],
        },
      });

      // We need to refresh the index so the data is available for the next call
      await es.indices.refresh({ index: `${ruleDataClient.indexName}*` });

      // Execute again to ensure that we read the object and write it again with the updated state
      const nextResults = await executor({ ...options, state: results });
      expect(nextResults.wrapped).to.eql({
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
                    [ALERT_UUID]: nextResults.trackedAlerts['host-01'].alertUuid,
                  },
                },
              ],
            },
          },
        },
      });
      const source = response.hits.hits[0]._source as any;

      // The state in Elasticsearch should match the state returned from the executor
      expect(source.testObject).to.eql(nextResults.wrapped && nextResults.wrapped.testObject);
    });
  });
}
