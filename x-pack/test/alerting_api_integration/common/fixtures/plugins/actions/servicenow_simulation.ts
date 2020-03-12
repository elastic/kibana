/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

interface ServiceNowRequest extends Hapi.Request {
  payload: {
    caseId: string;
    title?: string;
    description?: string;
    comments?: Array<{ commentId: string; version: string; comment: string }>;
  };
}
export function initPlugin(server: Hapi.Server, path: string) {
  server.route({
    method: 'POST',
    path,
    options: {
      auth: false,
      validate: {
        options: { abortEarly: false },
        payload: Joi.object().keys({
          caseId: Joi.string(),
          title: Joi.string(),
          description: Joi.string(),
          comments: Joi.array().items(
            Joi.object({
              commentId: Joi.string(),
              version: Joi.string(),
              comment: Joi.string(),
            })
          ),
        }),
      },
    },
    handler: servicenowHandler,
  });

  server.route({
    method: 'POST',
    path: `${path}/api/now/v2/table/incident`,
    options: {
      auth: false,
      validate: {
        options: { abortEarly: false },
        payload: Joi.object().keys({
          caseId: Joi.string(),
          title: Joi.string(),
          description: Joi.string(),
          comments: Joi.array().items(
            Joi.object({
              commentId: Joi.string(),
              version: Joi.string(),
              comment: Joi.string(),
            })
          ),
        }),
      },
    },
    handler: servicenowHandler,
  });

  server.route({
    method: 'PATCH',
    path: `${path}/api/now/v2/table/incident`,
    options: {
      auth: false,
      validate: {
        options: { abortEarly: false },
        payload: Joi.object().keys({
          caseId: Joi.string(),
          title: Joi.string(),
          description: Joi.string(),
          comments: Joi.array().items(
            Joi.object({
              commentId: Joi.string(),
              version: Joi.string(),
              comment: Joi.string(),
            })
          ),
        }),
      },
    },
    handler: servicenowHandler,
  });
}
// ServiceNow simulator: create a servicenow action pointing here, and you can get
// different responses based on the message posted. See the README.md for
// more info.

function servicenowHandler(request: ServiceNowRequest, h: any) {
  return jsonResponse(h, 200, {
    result: { sys_id: '123', number: 'INC01', sys_created_on: '2020-03-10 12:24:20' },
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
