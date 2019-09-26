/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

interface PagerdutyRequest extends Hapi.Request {
  payload: {
    dedup_key: string;
    payload: {
      summary: string;
    };
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
        payload: Joi.object()
          .unknown(true)
          .keys({
            dedup_key: Joi.string(),
            payload: Joi.object()
              .unknown(true)
              .keys({
                summary: Joi.string(),
              }),
          }),
      },
    },
    handler: pagerdutyHandler,
  });
}
// Pagerduty simulator: create an action pointing here, and you can get
// different responses based on the message posted. See the README.md for
// more info.
function pagerdutyHandler(request: PagerdutyRequest, h: any) {
  const body = request.payload;
  let dedupKey = body && body.dedup_key;
  const summary = body && body.payload && body.payload.summary;

  if (dedupKey == null) {
    dedupKey = `kibana-ft-simulator-dedup-key-${new Date().toISOString()}`;
  }

  switch (summary) {
    case 'respond-with-429':
      return jsonResponse(h, 429);
    case 'respond-with-502':
      return jsonResponse(h, 502);
    case 'respond-with-418':
      return jsonResponse(h, 418);
  }

  return jsonResponse(h, 202, {
    status: 'success',
    message: 'Event processed',
    dedup_key: dedupKey,
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
