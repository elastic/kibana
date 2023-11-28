/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';

import axios from 'axios';
import {
  createNewSAMLSession,
  SAMLSessionParams,
} from '../../../../test_serverless/shared/services/user_manager/saml_auth';

export const samlAuthentication = async (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<void> => {
  const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

  const kbnHost = config.env.KIBANA_URL || config.env.BASE_URL;

  const auth = btoa(`${config.env.ELASTICSEARCH_USERNAME}:${config.env.ELASTICSEARCH_PASSWORD}`);

  const response = await axios.get(`${kbnHost}/api/status`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const kbnVersion = response.data.version.number;

  const samlSessionParams: SAMLSessionParams = {
    username: config.env.EMAIL,
    password: config.env.PASSWORD,
    kbnHost,
    kbnVersion,
    log,
  };

  on('task', {
    createNewSAMLSession: async (): Promise<string> => {
      const session = await createNewSAMLSession(samlSessionParams);
      return session.getCookieValue();
    },
  });
};
