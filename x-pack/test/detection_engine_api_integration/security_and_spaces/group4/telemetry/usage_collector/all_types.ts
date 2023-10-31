/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getInitialDetectionMetrics } from '@kbn/security-solution-plugin/server/usage/detections/get_initial_usage';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createSignalsIndex, deleteAllRules, deleteAllAlerts, getStats } from '../../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  describe('Detection rule telemetry', async () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    it('should have initialized empty/zero values when no rules are running', async () => {
      await retry.try(async () => {
        const stats = await getStats(supertest, log);
        expect(stats).to.eql(getInitialDetectionMetrics());
      });
    });
  });
};
