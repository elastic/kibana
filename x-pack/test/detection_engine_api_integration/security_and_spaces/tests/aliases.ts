/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getRuleForSignalTesting,
  getSignalsById,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  interface HostAlias {
    name: string;
  }

  describe('Tests involving aliases of source indexes and the signals index', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alias');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/alias');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
    });

    it('should keep the original alias value such as "host_alias" from a source index when the value is indexed', async () => {
      const rule = getRuleForSignalTesting(['host_alias']);
      const { id } = await createRule(supertest, rule);
      await waitForRuleSuccessOrStatus(supertest, id);
      await waitForSignalsToBePresent(supertest, 4, [id]);
      const signalsOpen = await getSignalsById(supertest, id);
      const hits = signalsOpen.hits.hits.map(
        (signal) => (signal._source?.host_alias as HostAlias).name
      );
      expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
    });

    it('should copy alias data from a source index into the signals index in the same position when the target is ECS compatible', async () => {
      const rule = getRuleForSignalTesting(['host_alias']);
      const { id } = await createRule(supertest, rule);
      await waitForRuleSuccessOrStatus(supertest, id);
      await waitForSignalsToBePresent(supertest, 4, [id]);
      const signalsOpen = await getSignalsById(supertest, id);
      const hits = signalsOpen.hits.hits.map((signal) => (signal._source?.host as HostAlias).name);
      expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
    });
  });
};
