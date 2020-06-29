/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import Joi from 'joi';
import Hapi, { Util } from 'hapi';
import { fromNullable, map, filter, getOrElse } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { constant } from 'fp-ts/lib/function';

interface WebhookRequest extends Hapi.Request {
  payload: string;
}

export async function initPlugin(server: Hapi.Server, path: string) {
  server.auth.scheme('identifyCredentialsIfPresent', function identifyCredentialsIfPresent(
    s: Hapi.Server,
    options?: Hapi.ServerAuthSchemeOptions
  ) {
    const scheme = {
      async authenticate(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const credentials = pipe(
          fromNullable(request.headers.authorization),
          map((authorization) => authorization.split(/\s+/)),
          filter((parts) => parts.length > 1),
          map((parts) => Buffer.from(parts[1], 'base64').toString()),
          filter((credentialsPart) => credentialsPart.indexOf(':') !== -1),
          map((credentialsPart) => {
            const [username, password] = credentialsPart.split(':');
            return { username, password };
          }),
          getOrElse(constant({ username: '', password: '' }))
        );

        return h.authenticated({ credentials });
      },
    };

    return scheme;
  });
  server.auth.strategy('simple', 'identifyCredentialsIfPresent');

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
    handler: webhookHandler as Hapi.Lifecycle.Method,
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
    case 'failure':
      return htmlResponse(h, 500, `Error`);
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
  return h.response(text).type('text/html').code(code);
}
