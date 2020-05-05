/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

interface ServiceNowRequest extends Hapi.Request {
  payload: {
    short_description: string;
    description?: string;
    comments?: string;
  };
}
export function initPlugin(server: Hapi.Server, path: string) {
  server.route({
    method: 'POST',
    path: `${path}/api/now/v2/table/incident`,
    options: {
      auth: false,
    },
    handler: createHandler as Hapi.Lifecycle.Method,
  });

  server.route({
    method: 'PATCH',
    path: `${path}/api/now/v2/table/incident/{id}`,
    options: {
      auth: false,
    },
    handler: updateHandler as Hapi.Lifecycle.Method,
  });

  server.route({
    method: 'GET',
    path: `${path}/api/now/v2/table/incident/{id}`,
    options: {
      auth: false,
    },
    handler: getHandler as Hapi.Lifecycle.Method,
  });
}

// ServiceNow simulator: create a servicenow action pointing here, and you can get
// different responses based on the message posted. See the README.md for
// more info.
function createHandler(request: ServiceNowRequest, h: any) {
  return jsonResponse(h, 200, {
    result: { sys_id: '123', number: 'INC01', sys_created_on: '2020-03-10 12:24:20' },
  });
}

function updateHandler(request: ServiceNowRequest, h: any) {
  return jsonResponse(h, 200, {
    result: { sys_id: '123', number: 'INC01', sys_updated_on: '2020-03-10 12:24:20' },
  });
}

function getHandler(request: ServiceNowRequest, h: any) {
  return jsonResponse(h, 200, {
    result: {
      sys_id: '123',
      number: 'INC01',
      sys_created_on: '2020-03-10 12:24:20',
      short_description: 'title',
      description: 'description',
    },
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
