/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NOTE: This is pretty much a copy/paste from test/common/services/bsearch.ts but with the ability
// to provide custom auth

import expect from '@kbn/expect';
import request from 'superagent';
import type { IEsSearchResponse } from '@kbn/search-types';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { BFETCH_ROUTE_VERSION_LATEST } from '@kbn/bfetch-plugin/common';
import { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import { FtrService } from '../ftr_provider_context';

const parseBfetchResponse = (resp: request.Response): Array<Record<string, any>> => {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => JSON.parse(item));
};

const getSpaceUrlPrefix = (spaceId?: string): string => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

interface SendOptions {
  supertestWithoutAuth: SupertestWithoutAuthProviderType;
  auth: { username: string; password: string };
  referer?: string;
  kibanaVersion?: string;
  options: object;
  strategy: string;
  space?: string;
  internalOrigin: string;
}

export class BsearchSecureService extends FtrService {
  private readonly retry = this.ctx.getService('retry');

  async send<T extends IEsSearchResponse>({
    supertestWithoutAuth,
    auth,
    referer,
    kibanaVersion,
    internalOrigin,
    options,
    strategy,
    space,
  }: SendOptions) {
    const spaceUrl = getSpaceUrlPrefix(space);

    const { body } = await this.retry.try(async () => {
      let result;
      const url = `${spaceUrl}/internal/search/${strategy}`;
      if (referer && kibanaVersion) {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('referer', referer)
          .set('kbn-version', kibanaVersion)
          .set('kbn-xsrf', 'true')
          .send(options);
      } else if (referer) {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('referer', referer)
          .set('kbn-xsrf', 'true')
          .send(options);
      } else if (kibanaVersion) {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-version', kibanaVersion)
          .set('kbn-xsrf', 'true')
          .send(options);
      } else if (internalOrigin) {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('x-elastic-internal-origin', internalOrigin)
          .set('kbn-xsrf', 'true')
          .send(options);
      } else {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'true')
          .send(options);
      }
      if ((result.status === 500 || result.status === 200) && result.body) {
        return result;
      }
      throw new Error('try again');
    });

    if (!body.isRunning) {
      return body as T;
    }

    const result = await this.retry.try(async () => {
      const resp = await supertestWithoutAuth
        .post(`${spaceUrl}/internal/bsearch`)
        .auth(auth.username, auth.password)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
        .send({
          batch: [
            {
              request: {
                id: body.id,
                ...options,
              },
              options: {
                strategy,
              },
            },
          ],
        })
        .expect(200);
      const [parsedResponse] = parseBfetchResponse(resp);
      expect(parsedResponse.result.isRunning).equal(false);
      return parsedResponse.result;
    });

    return result as T;
  }
}
