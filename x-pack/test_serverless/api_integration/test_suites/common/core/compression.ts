/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const svlCommonApi = getService('svlCommonApi');

  const compressionSuite = (url: string) => {
    it(`uses compression when there isn't a referer`, async () => {
      await supertest
        .get(url)
        .set('accept-encoding', 'gzip')
        .set(svlCommonApi.getInternalRequestHeader())
        .then((response) => {
          expect(response.header).to.have.property('content-encoding', 'gzip');
        });
    });

    it(`uses compression when there is a whitelisted referer`, async () => {
      await supertest
        .get(url)
        .set('accept-encoding', 'gzip')
        .set(svlCommonApi.getInternalRequestHeader())
        .set('referer', 'https://some-host.com')
        .then((response) => {
          expect(response.header).to.have.property('content-encoding', 'gzip');
        });
    });
  };

  describe('compression', () => {
    describe('against an application page', () => {
      compressionSuite('/app/kibana');
    });
  });
}
