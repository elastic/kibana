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

  /** Disables and enables the alerting rule (effectively asserting that decryption works properly at runtime). */
  async function registerWithTaskManager(id: string, spaceId: string = '') {
    await supertest
      .post(`${getUrlPrefix(spaceId)}/api/alerting/rule/${id}/_disable`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
    await supertest
      .post(`${getUrlPrefix(spaceId)}/api/alerting/rule/${id}/_enable`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  }

  /** Resolves the alerting rule with a given ID in a given space. */
  async function resolveAlertingRule(id: string, spaceId: string = '') {
    return supertest.get(`${getUrlPrefix(spaceId)}/api/alerting/rule/${id}`);
  }

  describe('get existing', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/alerts_in_multiple_spaces');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/alerts_in_multiple_spaces');
    });

    it('should resolve to an alias match for the non default space rule', async () => {
      const oldObjectId = '58f37000-ef16-11eb-8970-13ff1ce2b1b6';
      const newObjectId = '8d7d8746-5863-5fd4-990e-027292e83a9a'; // This ID is not found in the test data archive; it is deterministically generated when the alerting rule is migrated to 8.0
      const spaceId = 'chrisspace';
      await registerWithTaskManager(newObjectId, spaceId);
      const response = await resolveAlertingRule(oldObjectId, spaceId);
      expect(response.body.resolveResponse).to.eql({
        outcome: 'aliasMatch',
        aliasTargetId: newObjectId,
      });
    });

    it('should resolve to an exact match for the default space rule', async () => {
      const oldObjectId = '41a31d60-ef16-11eb-8970-13ff1ce2b1b6';
      const newObjectId = '41a31d60-ef16-11eb-8970-13ff1ce2b1b6'; // This ID is not found in the test data archive; it is deterministically generated when the alerting rule is migrated to 8.0
      await registerWithTaskManager(newObjectId);
      const response = await resolveAlertingRule(oldObjectId);
      expect(response.body.resolveResponse).to.eql({
        outcome: 'exactMatch',
      });
    });
  });
}
