/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { AxiosError } from 'axios';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import { schema, TypeOf } from '@kbn/config-schema';

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

class TestSubActionConnector extends SubActionConnector<TestConfig, TestSecrets> {
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

  public async subActionWithParams({ id }: { id: string }) {
    return { id };
  }

  public async subActionWithoutParams() {
    return { id: 'test' };
  }

  public async noData() {}
}

export const getTestSubActionConnector = () => ({
  id: '.test-sub-action-connector',
  name: 'Test: Sub action connector',
  minimumLicenseRequired: 'platinum' as const,
  schema: { config: TestConfigSchema, secrets: TestSecretsSchema },
  Service: TestSubActionConnector,
});

export class TestNoSubActions extends SubActionConnector<TestConfig, TestSecrets> {
  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Error`;
  }
}

export const getTestSubActionConnectorWithoutSubActions = () => ({
  id: '.test-sub-action-connector-without-sub-actions',
  name: 'Test: Sub action connector',
  minimumLicenseRequired: 'platinum' as const,
  schema: { config: TestConfigSchema, secrets: TestSecretsSchema },
  Service: TestNoSubActions,
});
