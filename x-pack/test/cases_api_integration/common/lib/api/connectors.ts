/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import getPort from 'get-port';
import http from 'http';

import type SuperTest from 'supertest';
import { CASE_CONFIGURE_CONNECTORS_URL } from '@kbn/cases-plugin/common/constants';
import { getCaseConnectorsUrl } from '@kbn/cases-plugin/common/api';
import { ActionResult, FindActionResult } from '@kbn/actions-plugin/server/types';
import { getServiceNowServer } from '@kbn/actions-simulators-plugin/server/plugin';
import { RecordingServiceNowSimulator } from '@kbn/actions-simulators-plugin/server/servicenow_simulation';
import {
  Case,
  CaseConnector,
  Configuration,
  ConnectorTypes,
} from '@kbn/cases-plugin/common/types/domain';
import { CasePostRequest, GetCaseConnectorsResponse } from '@kbn/cases-plugin/common/types/api';
import { User } from '../authentication/types';
import { superUser } from '../authentication/users';
import { getPostCaseRequest } from '../mock';
import { ObjectRemover as ActionsRemover } from '../../../../alerting_api_integration/common/lib';
import { createConfiguration, getConfigurationRequest } from './configuration';
import { createCase } from './case';
import { getSpaceUrlPrefix } from './helpers';

export const getResilientConnector = () => ({
  name: 'Resilient Connector',
  connector_type_id: '.resilient',
  secrets: {
    apiKeyId: 'id',
    apiKeySecret: 'secret',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    orgId: 'pkey',
  },
});

export const getWebhookConnector = () => ({
  name: 'A generic Webhook action',
  connector_type_id: '.webhook',
  secrets: {
    user: 'user',
    password: 'password',
  },
  config: {
    headers: {
      'Content-Type': 'text/plain',
    },
    url: 'http://some.non.existent.com',
  },
});

export const getEmailConnector = () => ({
  name: 'An email action',
  connector_type_id: '.email',
  config: {
    service: '__json',
    from: 'bob@example.com',
  },
  secrets: {
    user: 'bob',
    password: 'supersecret',
  },
});

export const getServiceNowOAuthConnector = () => ({
  name: 'ServiceNow OAuth Connector',
  connector_type_id: '.servicenow',
  secrets: {
    clientSecret: 'xyz',
    privateKey: '-----BEGIN RSA PRIVATE KEY-----\nddddddd\n-----END RSA PRIVATE KEY-----',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    usesTableApi: false,
    isOAuth: true,
    clientId: 'abc',
    userIdentifierValue: 'elastic',
    jwtKeyId: 'def',
  },
});

export const getJiraConnector = () => ({
  name: 'Jira Connector',
  connector_type_id: '.jira',
  secrets: {
    email: 'elastic@elastic.co',
    apiToken: 'token',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    projectKey: 'pkey',
  },
});

export const getCasesWebhookConnector = () => ({
  name: 'Cases Webhook Connector',
  connector_type_id: '.cases-webhook',
  secrets: {
    user: 'user',
    password: 'pass',
  },
  config: {
    createCommentJson: '{"body":{{{case.comment}}}}',
    createCommentMethod: 'post',
    createCommentUrl: 'http://some.non.existent.com/{{{external.system.id}}}/comment',
    createIncidentJson:
      '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
    createIncidentMethod: 'post',
    createIncidentResponseKey: 'id',
    createIncidentUrl: 'http://some.non.existent.com/',
    getIncidentResponseExternalTitleKey: 'key',
    hasAuth: true,
    headers: { [`content-type`]: 'application/json' },
    viewIncidentUrl: 'http://some.non.existent.com/browse/{{{external.system.title}}}',
    getIncidentUrl: 'http://some.non.existent.com/{{{external.system.id}}}',
    updateIncidentJson:
      '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
    updateIncidentMethod: 'put',
    updateIncidentUrl: 'http://some.non.existent.com/{{{external.system.id}}}',
  },
});

export const getServiceNowSIRConnector = () => ({
  name: 'ServiceNow SIR Connector',
  connector_type_id: '.servicenow-sir',
  secrets: {
    username: 'admin',
    password: 'password',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    usesTableApi: false,
  },
});

export const getServiceNowConnector = () => ({
  name: 'ServiceNow Connector',
  connector_type_id: '.servicenow',
  secrets: {
    username: 'admin',
    password: 'password',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    usesTableApi: false,
  },
});

export const getRecordingServiceNowSimulatorServer = async (): Promise<{
  server: RecordingServiceNowSimulator;
  url: string;
}> => {
  const simulator = await RecordingServiceNowSimulator.start();
  const url = await startServiceNowSimulatorListening(simulator.server);

  return { server: simulator, url };
};

const startServiceNowSimulatorListening = async (server: http.Server) => {
  const port = await getPort({ port: getPort.makeRange(9000, 9100) });
  if (!server.listening) {
    server.listen(port);
  }
  const url = `http://localhost:${port}`;

  return url;
};

export const getServiceNowSimulationServer = async (): Promise<{
  server: http.Server;
  url: string;
}> => {
  const server = await getServiceNowServer();
  const url = await startServiceNowSimulatorListening(server);

  return { server, url };
};

export const getCaseConnectors = async ({
  supertest,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<FindActionResult[]> => {
  const { body: connectors } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASE_CONFIGURE_CONNECTORS_URL}/_find`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return connectors;
};

export const createCaseWithConnector = async ({
  supertest,
  configureReq = {},
  serviceNowSimulatorURL,
  actionsRemover,
  auth = { user: superUser, space: null },
  createCaseReq = getPostCaseRequest(),
  headers = {},
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  serviceNowSimulatorURL: string;
  actionsRemover: ActionsRemover;
  configureReq?: Record<string, unknown>;
  auth?: { user: User; space: string | null } | null;
  createCaseReq?: CasePostRequest;
  headers?: Record<string, unknown>;
}): Promise<{
  postedCase: Case;
  connector: CreateConnectorResponse;
  configuration: Configuration;
}> => {
  const connector = await createConnector({
    supertest,
    req: {
      ...getServiceNowConnector(),
      config: { apiUrl: serviceNowSimulatorURL },
    },
    auth: auth ?? undefined,
  });

  actionsRemover.add(auth?.space ?? 'default', connector.id, 'action', 'actions');

  const [configuration, postedCase] = await Promise.all([
    createConfiguration(
      supertest,
      {
        ...getConfigurationRequest({
          id: connector.id,
          name: connector.name,
          type: connector.connector_type_id as ConnectorTypes,
        }),
        ...configureReq,
      },
      200,
      auth ?? undefined
    ),
    createCase(
      supertest,
      {
        ...createCaseReq,
        connector: {
          id: connector.id,
          name: connector.name,
          type: connector.connector_type_id,
          fields: {
            urgency: '2',
            impact: '2',
            severity: '2',
            category: 'software',
            subcategory: 'os',
          },
        } as CaseConnector,
      },
      200,
      auth,
      headers
    ),
  ]);

  return { postedCase, connector, configuration };
};

export type CreateConnectorResponse = Omit<ActionResult, 'actionTypeId'> & {
  connector_type_id: string;
};

export const createConnector = async ({
  supertest,
  req,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  req: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CreateConnectorResponse> => {
  const { body: connector } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}/api/actions/connector`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return connector;
};

export const getConnectors = async ({
  supertest,
  caseId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<GetCaseConnectorsResponse> => {
  const { body: connectors } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${getCaseConnectorsUrl(caseId)}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return connectors;
};
