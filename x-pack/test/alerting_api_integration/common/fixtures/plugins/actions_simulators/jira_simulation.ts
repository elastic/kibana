/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

interface JiraRequest extends Hapi.Request {
  payload: {
    summary: string;
    description?: string;
    comments?: string;
  };
}
export function initPlugin(server: Hapi.Server, path: string) {
  server.route({
    method: 'POST',
    path: `${path}/rest/api/2/issue`,
    options: {
      auth: false,
    },
    handler: createHandler as Hapi.Lifecycle.Method,
  });

  server.route({
    method: 'PUT',
    path: `${path}/rest/api/2/issue/{id}`,
    options: {
      auth: false,
    },
    handler: updateHandler as Hapi.Lifecycle.Method,
  });

  server.route({
    method: 'GET',
    path: `${path}/rest/api/2/issue/{id}`,
    options: {
      auth: false,
    },
    handler: getHandler as Hapi.Lifecycle.Method,
  });

  server.route({
    method: 'POST',
    path: `${path}/rest/api/2/issue/{id}/comment`,
    options: {
      auth: false,
    },
    handler: createCommentHanlder as Hapi.Lifecycle.Method,
  });
}

// ServiceNow simulator: create a servicenow action pointing here, and you can get
// different responses based on the message posted. See the README.md for
// more info.
function createHandler(request: JiraRequest, h: any) {
  return jsonResponse(h, 200, {
    id: '123',
    key: 'CK-1',
    created: '2020-04-27T14:17:45.490Z',
  });
}

function updateHandler(request: JiraRequest, h: any) {
  return jsonResponse(h, 200, {
    id: '123',
    key: 'CK-1',
    created: '2020-04-27T14:17:45.490Z',
    updated: '2020-04-27T14:17:45.490Z',
  });
}

function getHandler(request: JiraRequest, h: any) {
  return jsonResponse(h, 200, {
    id: '123',
    key: 'CK-1',
    created: '2020-04-27T14:17:45.490Z',
    updated: '2020-04-27T14:17:45.490Z',
    summary: 'title',
    description: 'description',
  });
}

function createCommentHanlder(request: JiraRequest, h: any) {
  return jsonResponse(h, 200, {
    id: '123',
    created: '2020-04-27T14:17:45.490Z',
  });
}

function jsonResponse(h: any, code: number, object?: any) {
  if (object == null) {
    return h.response('').code(code);
  }

  return h
    .response(JSON.stringify(object))
    .type('application/json')
    .code(code);
}
