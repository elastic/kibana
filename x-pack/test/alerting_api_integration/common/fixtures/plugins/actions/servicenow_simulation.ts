/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

interface ServiceNowRequest extends Hapi.Request {
  payload: {
    comments: string;
    short_description: string;
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
          comments: Joi.string(),
          short_description: Joi.string(),
        }),
      },
    },
    handler: servicenowHandler,
  });

  server.route({
    method: 'POST',
    path: `${path}/api/now/v1/table/incident`,
    options: {
      auth: false,
      validate: {
        options: { abortEarly: false },
        payload: Joi.object().keys({
          comments: Joi.string(),
          short_description: Joi.string(),
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
  const body = request.payload;
  const text = body && body.short_description;
  if (text == null) {
    return jsonResponse(h, 400, 'bad request to servicenow simulator');
  }

  switch (text) {
    case 'success':
      return jsonResponse(h, 200, 'Success');

    case 'created':
      return jsonResponse(h, 201, 'Created');

    case 'no_text':
      return jsonResponse(h, 204, 'Success');

    case 'invalid_payload':
      return jsonResponse(h, 400, 'Bad Request');

    case 'unauthorized':
      return jsonResponse(h, 401, 'Unauthorized');

    case 'forbidden':
      return jsonResponse(h, 403, 'Forbidden');

    case 'not_found':
      return jsonResponse(h, 404, 'Not found');

    case 'not_allowed':
      return jsonResponse(h, 405, 'Method not allowed');

    case 'not_acceptable':
      return jsonResponse(h, 406, 'Not acceptable');

    case 'unsupported':
      return jsonResponse(h, 415, 'Unsupported media type');

    case 'status_500':
      return jsonResponse(h, 500, 'simulated servicenow 500 response');

    case 'rate_limit':
      const response = {
        retry_after: 1,
        ok: false,
        error: 'rate_limited',
      };

      return h
        .response(response)
        .type('application/json')
        .header('retry-after', '1')
        .code(429);
  }

  return jsonResponse(h, 400, 'unknown request to servicenow simulator');
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
