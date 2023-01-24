/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

// eslint-disable-next-line import/no-default-export
export default function telemetryTests({ loadTestFile, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  describe('Alerting and Actions Telemetry', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/event_log_telemetry');
      // reset the state in the telemetry task
      await setupSpacesAndUsers(getService);
    });
    after(async () => {
      await tearDown(getService);
      await esArchiver.unload('x-pack/test/functional/es_archives/event_log_telemetry');
    });

    loadTestFile(require.resolve('./alerting_and_actions_telemetry'));
  });
}
