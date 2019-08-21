/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import Joi from 'joi';
import Hapi, { Util } from 'hapi';
import HapiBasic from '@hapi/basic';

interface WebhookRequest extends Hapi.Request {
  payload: string;
}

async function validate(
  request: Hapi.Request,
  username: string,
  password: string,
  h: Hapi.ResponseToolkit
): Promise<{ isValid: boolean; credentials: any }> {
  return { isValid: true, credentials: { username, password } };
}

export async function initPlugin(server: Hapi.Server, path: string) {
  await server.register(HapiBasic);
  server.auth.strategy('simple', 'basic', { validate });

  server.route({
    method: ['POST', 'PUT'],
    path,
    options: {
      auth: 'simple',
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

  switch (body) {
    case 'success':
      return htmlResponse(h, 200, `OK`);
    case 'authenticate':
      return validateAuthentication(request, h);
    case 'success_post_method':
      return validateRequestUsesMethod(request, h, 'post');
    case 'success_put_method':
      return validateRequestUsesMethod(request, h, 'put');
  }

  return htmlResponse(
    h,
    400,
    `unknown request to webhook simulator [${body ? `content: ${body}` : `no content`}]`
  );
}

function validateAuthentication(request: WebhookRequest, h: any) {
  const {
    auth: { credentials },
  } = request;
  try {
    expect(credentials).to.eql({
      username: 'elastic',
      password: 'changeme',
    });
    return htmlResponse(h, 200, `OK`);
  } catch (ex) {
    return htmlResponse(h, 403, `the validateAuthentication operation failed. ${ex.message}`);
  }
}

function validateRequestUsesMethod(
  request: WebhookRequest,
  h: any,
  method: Util.HTTP_METHODS_PARTIAL
) {
  try {
    expect(request.method).to.eql(method);
    return htmlResponse(h, 200, `OK`);
  } catch (ex) {
    return htmlResponse(h, 403, `the validateAuthentication operation failed. ${ex.message}`);
  }
}

function htmlResponse(h: any, code: number, text: string) {
  return h
    .response(text)
    .type('text/html')
    .code(code);
}
