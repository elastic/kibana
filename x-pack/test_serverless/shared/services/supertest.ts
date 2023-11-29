/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest, { type SuperAgentTest } from 'supertest';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

/**
 * Return a new SuperAgentTest instance for every API call to avoid cookie caching.
 * If you want to verify cookies are empty use the following code:
 * import { CookieAccessInfo } from 'cookiejar';
 * console.log(JSON.stringify(agent.jar.getCookies(CookieAccessInfo.All)));
 */
const initSuperAgentTest = (kbnUrl: string, ca?: string[]) => {
  return {
    get(url: string) {
      const agent = supertest.agent(kbnUrl, { ca });
      return agent.get(url);
    },
    delete(url: string) {
      const agent = supertest.agent(kbnUrl, { ca });
      return agent.delete(url);
    },
    post(url: string) {
      const agent = supertest.agent(kbnUrl, { ca });
      return agent.post(url);
    },
    patch(url: string) {
      const agent = supertest.agent(kbnUrl, { ca });
      return agent.patch(url);
    },
    put(url: string) {
      const agent = supertest.agent(kbnUrl, { ca });
      return agent.put(url);
    },
  } as Pick<SuperAgentTest, 'get' | 'delete' | 'post' | 'patch' | 'put'>;
};

export function SupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl(config.get('servers.kibana'));
  const ca = config.get('servers.kibana').certificateAuthorities;

  return initSuperAgentTest(kbnUrl, ca);
}

export function SupertestWithoutAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });
  const ca = config.get('servers.kibana').certificateAuthorities as string[];

  return initSuperAgentTest(kbnUrl, ca);
}
