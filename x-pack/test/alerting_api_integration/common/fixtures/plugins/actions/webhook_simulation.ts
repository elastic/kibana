/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import Hapi from 'hapi';

interface WebhookRequest extends Hapi.Request {
  payload: string;
}
export function initPlugin(server: Hapi.Server, path: string) {
  server.route({
    method: 'POST',
    path,
    options: {
      auth: false,
      validate: {
        options: { abortEarly: false },
        payload: Joi.string(),
      },
    },
    handler: webhookHandler,
  });
}

function webhookHandler(request: WebhookRequest, h: any) {
  const body = request.payload;

  return htmlResponse(
    h,
    400,
    `unknown request to webhook simulator [${body ? `content: ${body}` : `no content`}]`
  );
}

function htmlResponse(h: any, code: number, text: string) {
  return h
    .response(text)
    .type('text/html')
    .code(code);
}
