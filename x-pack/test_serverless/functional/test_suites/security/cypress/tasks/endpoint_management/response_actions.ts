/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseActionsApiCommandNames } from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/constants';
import { request } from '@kbn/security-solution-plugin/public/management/cypress/tasks/common';
import {
  EXECUTE_ROUTE,
  GET_FILE_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
  UPLOAD_ROUTE,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { UserAuthzAccessLevel } from '../../screens/endpoint_management';

/**
 * Ensure user has the given `accessLevel` to the type of response action
 * @param accessLevel
 * @param responseAction
 * @param username
 * @param password
 */
export const ensureResponseActionAuthzAccess = (
  accessLevel: Exclude<UserAuthzAccessLevel, 'read'>,
  responseAction: ResponseActionsApiCommandNames,
  username: string,
  password: string
): Cypress.Chainable => {
  let url: string = '';
  let apiPayload: any = {
    endpoint_ids: ['some-id'],
  };

  switch (responseAction) {
    case 'isolate':
      url = ISOLATE_HOST_ROUTE_V2;
      break;

    case 'unisolate':
      url = UNISOLATE_HOST_ROUTE_V2;
      break;

    case 'get-file':
      url = GET_FILE_ROUTE;
      Object.assign(apiPayload, { parameters: { path: 'one/two' } });
      break;

    case 'execute':
      url = EXECUTE_ROUTE;
      Object.assign(apiPayload, { parameters: { command: 'foo' } });
      break;
    case 'running-processes':
      url = GET_PROCESSES_ROUTE;
      break;

    case 'kill-process':
      url = KILL_PROCESS_ROUTE;
      Object.assign(apiPayload, { parameters: { pid: 123 } });
      break;

    case 'suspend-process':
      url = SUSPEND_PROCESS_ROUTE;
      Object.assign(apiPayload, { parameters: { pid: 123 } });
      break;

    case 'upload':
      url = UPLOAD_ROUTE;
      {
        const file = new File(['foo'], 'foo.txt');
        const formData = new FormData();

        formData.append('file', file, file.name);

        for (const [key, value] of Object.entries(apiPayload as object)) {
          formData.append(key, typeof value !== 'string' ? JSON.stringify(value) : value);
        }

        apiPayload = formData;
      }
      break;

    default:
      throw new Error(`Response action [${responseAction}] has no API payload defined`);
  }

  const requestOptions: Partial<Cypress.RequestOptions> = {
    url,
    method: 'post',
    auth: {
      user: username,
      pass: password,
    },
    headers: {
      'Content-Type': undefined,
    },
    failOnStatusCode: false,
    body: apiPayload as Cypress.RequestBody,
  };

  if (accessLevel === 'none') {
    return request(requestOptions).its('status').should('equal', 403);
  }

  return request(requestOptions).its('status').should('not.equal', 403);
};
