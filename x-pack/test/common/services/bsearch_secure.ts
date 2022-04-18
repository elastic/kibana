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
import type SuperTest from 'supertest';
import { IEsSearchResponse } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../ftr_provider_context';
import { RetryService } from '../../../../test/common/services/retry/retry';

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
  supertestWithoutAuth: SuperTest.SuperTest<SuperTest.Test>;
  auth: { username: string; password: string };
  referer?: string;
  kibanaVersion?: string;
  options: object;
  strategy: string;
  space?: string;
}

export const BSecureSearchFactory = (retry: RetryService) => ({
  send: async <T extends IEsSearchResponse>({
    supertestWithoutAuth,
    auth,
    referer,
    kibanaVersion,
    options,
    strategy,
    space,
  }: SendOptions): Promise<T> => {
    const spaceUrl = getSpaceUrlPrefix(space);
    const response = await retry.try(async () => {
      let result;
      const url = `${spaceUrl}/internal/search/${strategy}`;
      if (referer && kibanaVersion) {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set('referer', referer)
          .set('kbn-version', kibanaVersion)
          .set('kbn-xsrf', 'true')
          .send(options);
      } else if (referer) {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set('referer', referer)
          .set('kbn-xsrf', 'true')
          .send(options);
      } else if (kibanaVersion) {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set('kbn-version', kibanaVersion)
          .set('kbn-xsrf', 'true')
          .send(options);
      } else {
        result = await supertestWithoutAuth
          .post(url)
          .auth(auth.username, auth.password)
          .set('kbn-xsrf', 'true')
          .send(options);
      }
      if (result.status === 500 || result.status === 200) {
        return result;
      }
      throw new Error('try again');
    });

    // eslint-disable-next-line no-console
    console.log('*** CHRIS RESPONSE ***');
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(response));
    const body = response.body; // || response.text;

    if (body.isRunning) {
      const result = await retry.try(async () => {
        const resp = await supertestWithoutAuth
          .post(`${spaceUrl}/internal/bsearch`)
          .auth(auth.username, auth.password)
          .set('kbn-xsrf', 'true')
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
      return result;
    } else {
      return body;
    }
  },
});

export function BSecureSearchProvider({
  getService,
}: FtrProviderContext): ReturnType<typeof BSecureSearchFactory> {
  const retry = getService('retry');
  return BSecureSearchFactory(retry);
}
