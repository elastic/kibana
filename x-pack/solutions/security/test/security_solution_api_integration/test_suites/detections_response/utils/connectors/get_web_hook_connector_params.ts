/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateConnectorBody } from './create_connector';

export function getWebHookConnectorParams(): CreateConnectorBody {
  return {
    name: 'Webhook connector',
    connector_type_id: '.webhook',
    config: {
      method: 'post',
      url: 'http://localhost',
    },
    secrets: {
      user: 'example',
      password: 'example',
    },
  };
}
