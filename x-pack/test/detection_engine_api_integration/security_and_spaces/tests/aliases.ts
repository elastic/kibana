/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  EqlCreateSchema,
  ThresholdCreateSchema,
} from '../../../../plugins/security_solution/common/detection_engine/schemas/request';

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

  interface EventModule {
    module: string;
    dataset: string;
  }

  describe('Tests involving aliases of source indexes and the signals index', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await esArchiver.load('security_solution/alias');
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
      await esArchiver.unload('security_solution/alias');
    });

    it('Should keep the original alias value such as "host_alias" from a source index even if that value is not indexed', async () => {
      const rule = getRuleForSignalTesting(['alias']);
      const { id } = await createRule(supertest, rule);
      await waitForRuleSuccessOrStatus(supertest, id);
      await waitForSignalsToBePresent(supertest, 4, [id]);
      const signalsOpen = await getSignalsById(supertest, id);
      const hits = signalsOpen.hits.hits.map((signal) => signal._source.host_alias.name);
      expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
    });

    // TODO: Make aliases work to where we can have ECS fields such as host.name filled out
    it.skip('Should copy alias data from a source index into the signals index in the same position if the target is ECS compatible', async () => {
      const rule = getRuleForSignalTesting(['alias']);
      const { id } = await createRule(supertest, rule);
      await waitForRuleSuccessOrStatus(supertest, id);
      await waitForSignalsToBePresent(supertest, 4, [id]);
      const signalsOpen = await getSignalsById(supertest, id);
      const hits = signalsOpen.hits.hits.map((signal) => signal._source.host.name);
      expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
    });
  });
};
