/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { CASES_URL } from '../../../../../../plugins/cases/common/constants';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
    });

    it('7.11.0 migrates cases comments', async () => {
      const { body: comment } = await supertest
        .get(
          `${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509/comments/da677740-1ac7-11eb-b5a3-25ee88122510`
        )
        .set('kbn-xsrf', 'true')
        .send();

      expect(comment.type).to.eql('user');
    });
  });
}
