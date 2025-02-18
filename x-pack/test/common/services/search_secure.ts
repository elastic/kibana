/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NOTE: This is pretty much a copy/paste from packages/kbn-ftr-common-functional-services/services/bsearch.ts
// but with the ability to provide custom auth

import expect from '@kbn/expect';
import type { IEsSearchResponse } from '@kbn/search-types';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import { FtrService } from '../ftr_provider_context';

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

export class SearchSecureService extends FtrService {
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
    const statusesWithoutRetry = [200, 400, 403, 500];

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

      if (statusesWithoutRetry.includes(result.status) && result.body) {
        return result;
      }

      throw new Error('try again');
    });

    if (!body.isRunning) {
      return body as T;
    }

    const result = await this.retry.try(async () => {
      const resp = await supertestWithoutAuth
        .post(`${spaceUrl}/internal/search/${strategy}/${body.id}`)
        .auth(auth.username, auth.password)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(options)
        .expect(200);
      expect(resp.body.isRunning).equal(false);
      return resp.body;
    });

    return result as T;
  }
}
