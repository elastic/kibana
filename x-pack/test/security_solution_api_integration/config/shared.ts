/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/actions-plugin/server/application/connector/types';

interface PreconfiguredConnector extends Pick<Connector, 'name' | 'actionTypeId' | 'config'> {
  secrets: {
    user: string;
    password: string;
  };
}

export const PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID = 'my-test-email';

export const PRECONFIGURED_ACTION_CONNECTORS: Record<string, PreconfiguredConnector> = {
  [PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID]: {
    actionTypeId: '.email',
    name: 'TestEmail#xyz',
    config: {
      from: 'me@test.com',
      service: '__json',
    },
    secrets: {
      user: 'user',
      password: 'password',
    },
  },
};
