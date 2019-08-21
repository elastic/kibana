/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

interface SlackRequest extends Hapi.Request {
  payload: {
    text: string;
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
          text: Joi.string(),
        }),
      },
    },
    handler: slackHandler,
  });
}
// Slack simulator: create a slack action pointing here, and you can get
// different responses based on the message posted. See the README.md for
// more info.

function slackHandler(request: SlackRequest, h: any) {
  const body = request.payload;
  const text = body && body.text;

  if (text == null) {
    return htmlResponse(h, 400, 'bad request to slack simulator');
  }

  switch (text) {
    case 'success':
      return htmlResponse(h, 200, 'ok');

    case 'no_text':
      return htmlResponse(h, 400, 'no_text');

    case 'invalid_payload':
      return htmlResponse(h, 400, 'invalid_payload');

    case 'invalid_token':
      return htmlResponse(h, 403, 'invalid_token');

    case 'status_500':
      return htmlResponse(h, 500, 'simulated slack 500 response');

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

  return htmlResponse(h, 400, 'unknown request to slack simulator');
}

function htmlResponse(h: any, code: number, text: string) {
  return h
    .response(text)
    .type('text/html')
    .code(code);
}
