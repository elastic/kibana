/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasesConfigureRequest, CasesConfigureResponse } from '../../../../plugins/case/common/api';

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

export const removeServerGeneratedPropertiesFromConfigure = (
  config: Partial<CasesConfigureResponse>
): Partial<CasesConfigureResponse> => {
  const { created_at, updated_at, version, ...rest } = config;
  return rest;
};

export const deleteConfiguration = async (es: any): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-configure',
    waitForCompletion: true,
    refresh: 'wait_for',
    body: {},
  });
};

export const getConnector = () => ({
  name: 'ServiceNow Connector',
  actionTypeId: '.servicenow',
  secrets: {
    username: 'admin',
    password: 'admin',
  },
  config: {
    apiUrl: 'localhost',
    casesConfiguration: {
      mapping: [
        {
          source: 'title',
          target: 'short_description',
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
