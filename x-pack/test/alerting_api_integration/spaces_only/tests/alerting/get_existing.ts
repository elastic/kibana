/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getUrlPrefix } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetExistingTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get existing', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/alerts_in_multiple_spaces');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/alerts_in_multiple_spaces');
    });

    it('should show the alias resolve match for the non default space rule', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(`chrisspace`)}/api/alerting/rule/100ff690-eaf9-11eb-9cd0-ed3f761f7f83`
      );

      expect(response.body.resolveResponse).to.eql({
        outcome: 'aliasMatch',
        aliasTargetId: 'fdc84d89-1f92-5511-b4a4-65034392a07a',
      });
    });

    it('should show the absolute resolve match for the default space rule', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/efb7a0f0-eaf8-11eb-9cd0-ed3f761f7f83`
      );

      expect(response.body.resolveResponse).to.eql({
        outcome: 'exactMatch',
      });
    });
  });
}
