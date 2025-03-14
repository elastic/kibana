/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { AxiosError } from 'axios';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server/plugin';
import { schema, TypeOf } from '@kbn/config-schema';
import { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

const TestConfigSchema = schema.object({ url: schema.string() });
const TestSecretsSchema = schema.object({
  username: schema.string(),
  password: schema.string(),
});

type TestConfig = TypeOf<typeof TestConfigSchema>;
type TestSecrets = TypeOf<typeof TestSecretsSchema>;

interface ErrorSchema {
  errorMessage: string;
  errorCode: number;
}

export const getTestSubActionConnector = (
  actions: ActionsPluginSetup
): SubActionConnectorType<TestConfig, TestSecrets> => {
  const SubActionConnector = actions.getSubActionConnectorClass<TestConfig, TestSecrets>();

  class TestSubActionConnector extends SubActionConnector {
    constructor(params: ServiceParams<TestConfig, TestSecrets>) {
      super(params);
      this.registerSubAction({
        name: 'subActionWithParams',
        method: 'subActionWithParams',
        schema: schema.object({ id: schema.string() }),
      });

      this.registerSubAction({
        name: 'subActionWithoutParams',
        method: 'subActionWithoutParams',
        schema: null,
      });

      this.registerSubAction({
        name: 'notExist',
        method: 'notExist',
        schema: schema.object({}),
      });

      this.registerSubAction({
        name: 'notAFunction',
        method: 'notAFunction',
        schema: schema.object({}),
      });

      this.registerSubAction({
        name: 'noData',
        method: 'noData',
        schema: null,
      });
    }

    protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
      return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
    }

    public async subActionWithParams(
      { id }: { id: string },
      connectorUsageCollector: ConnectorUsageCollector
    ) {
      connectorUsageCollector.addRequestBodyBytes(undefined, { id });
      return { id };
    }

    public async subActionWithoutParams() {
      return { id: 'test' };
    }

    public async noData() {}
  }

  return {
    id: 'test.sub-action-connector',
    name: 'Test: Sub action connector',
    minimumLicenseRequired: 'platinum' as const,
    supportedFeatureIds: ['alerting'],
    schema: { config: TestConfigSchema, secrets: TestSecretsSchema },
    getService: (params) => new TestSubActionConnector(params),
  };
};

export const getTestSubActionConnectorWithoutSubActions = (
  actions: ActionsPluginSetup
): SubActionConnectorType<TestConfig, TestSecrets> => {
  const SubActionConnector = actions.getSubActionConnectorClass<TestConfig, TestSecrets>();

  class TestNoSubActions extends SubActionConnector {
    protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
      return `Error`;
    }
  }

  return {
    id: 'test.sub-action-connector-without-sub-actions',
    name: 'Test: Sub action connector',
    minimumLicenseRequired: 'platinum' as const,
    supportedFeatureIds: ['alerting'],
    schema: { config: TestConfigSchema, secrets: TestSecretsSchema },
    getService: (params) => new TestNoSubActions(params),
  };
};
