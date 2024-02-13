/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { getSecurityTelemetryStats, removeTimeFieldsFromTelemetryStats } from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  describe('@ess @serverless All task telemetry types generically', async () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await deleteAllExceptions(supertest, log);
    });

    it('@skipInQA should only have task metric values when no rules are running', async () => {
      await retry.try(async () => {
        const stats = await getSecurityTelemetryStats(supertest, log);
        removeTimeFieldsFromTelemetryStats(stats);
        expect(stats).to.eql({
          detection_rules: [
            [
              {
                name: 'security:telemetry-detection-rules',
                passed: true,
              },
            ],
          ],
          security_lists: [
            [
              {
                name: 'security:telemetry-lists',
                passed: true,
              },
            ],
          ],
          endpoints: [
            [
              {
                name: 'security:endpoint-meta-telemetry',
                passed: true,
              },
            ],
          ],
          diagnostics: [
            [
              {
                name: 'security:endpoint-diagnostics',
                passed: true,
              },
            ],
          ],
        });
      });
    });
  });
};
