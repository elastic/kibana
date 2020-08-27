/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';
import { CasesConfigureRequest, CasesConfigureResponse } from '../../../../plugins/case/common/api';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const getConfiguration = (connector_id: string = 'connector-1'): CasesConfigureRequest => {
  return {
    connector_id,
    connector_name: 'Connector 1',
    closure_type: 'close-by-user',
  };
};

export const getConfigurationOutput = (update = false): Partial<CasesConfigureResponse> => {
  return {
    ...getConfiguration(),
    created_by: { email: null, full_name: null, username: 'elastic' },
    updated_by: update ? { email: null, full_name: null, username: 'elastic' } : null,
  };
};

export const getServiceNowConnector = () => ({
  name: 'ServiceNow Connector',
  actionTypeId: '.servicenow',
  secrets: {
    username: 'admin',
    password: 'password',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    incidentConfiguration: {
      mapping: [
        {
          source: 'title',
          target: 'short_description',
          actionType: 'overwrite',
        },
        {
          source: 'description',
          target: 'description',
          actionType: 'append',
        },
        {
          source: 'comments',
          target: 'comments',
          actionType: 'append',
        },
      ],
    },
    isCaseOwned: true,
  },
});

export const getJiraConnector = () => ({
  name: 'Jira Connector',
  actionTypeId: '.jira',
  secrets: {
    email: 'elastic@elastic.co',
    apiToken: 'token',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    projectKey: 'pkey',
    casesConfiguration: {
      mapping: [
        {
          source: 'title',
          target: 'summary',
          actionType: 'overwrite',
        },
        {
          source: 'description',
          target: 'description',
          actionType: 'overwrite',
        },
        {
          source: 'comments',
          target: 'comments',
          actionType: 'append',
        },
      ],
    },
  },
});

export const getResilientConnector = () => ({
  name: 'Resilient Connector',
  actionTypeId: '.resilient',
  secrets: {
    apiKeyId: 'id',
    apiKeySecret: 'secret',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    orgId: 'pkey',
    casesConfiguration: {
      mapping: [
        {
          source: 'title',
          target: 'summary',
          actionType: 'overwrite',
        },
        {
          source: 'description',
          target: 'description',
          actionType: 'overwrite',
        },
        {
          source: 'comments',
          target: 'comments',
          actionType: 'append',
        },
      ],
    },
  },
});

export const removeServerGeneratedPropertiesFromConfigure = (
  config: Partial<CasesConfigureResponse>
): Partial<CasesConfigureResponse> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { created_at, updated_at, version, ...rest } = config;
  return rest;
};

export const deleteCasesUserActions = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-user-actions',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteCases = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteComments = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-comments',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteConfiguration = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-configure',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};
