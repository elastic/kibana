/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSecurityTelemetryStats,
  removeTimeFieldsFromTelemetryStats,
} from '../../../../utils';
import { deleteAllExceptions } from '../../../../../lists_api_integration/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');

  describe('All task telemetry types generically', async () => {
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
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllExceptions(supertest, log);
    });

    it('should only have task metric values when no rules are running', async () => {
      await retry.try(async () => {
        const stats = await getSecurityTelemetryStats(supertest, log);
        removeTimeFieldsFromTelemetryStats(stats);
        expect(stats).to.eql({
          detection_rules: [
            [
              {
                name: 'Security Solution Detection Rule Lists Telemetry',
                passed: true,
              },
            ],
          ],
          security_lists: [
            [
              {
                name: 'Security Solution Lists Telemetry',
                passed: true,
              },
            ],
          ],
          endpoints: [
            [
              {
                name: 'Security Solution Telemetry Endpoint Metrics and Info task',
                passed: true,
              },
            ],
          ],
          diagnostics: [
            [
              {
                name: 'Security Solution Telemetry Diagnostics task',
                passed: true,
              },
            ],
          ],
        });
      });
    });
  });
};
