/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

// eslint-disable-next-line import/no-default-export
export default function alertingTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Alerts', () => {
    describe('legacy alerts', function () {
      before(async () => {
        await setupSpacesAndUsers(getService);
      });

      after(async () => {
        await tearDown(getService);
      });

      loadTestFile(require.resolve('./rbac_legacy'));
    });

    describe('alerts', () => {
      before(async () => {
        await setupSpacesAndUsers(getService);
      });

      after(async () => {
        await tearDown(getService);
      });

      loadTestFile(require.resolve('./mute_all'));
      loadTestFile(require.resolve('./mute_instance'));
      loadTestFile(require.resolve('./unmute_all'));
      loadTestFile(require.resolve('./unmute_instance'));
      loadTestFile(require.resolve('./update'));
      loadTestFile(require.resolve('./update_api_key'));
      loadTestFile(require.resolve('./alerts'));
      loadTestFile(require.resolve('./event_log'));
      loadTestFile(require.resolve('./mustache_templates'));
      loadTestFile(require.resolve('./health'));
      loadTestFile(require.resolve('./excluded'));
      loadTestFile(require.resolve('./snooze'));
      loadTestFile(require.resolve('./global_execution_log'));
      loadTestFile(require.resolve('./get_global_execution_kpi'));
      loadTestFile(require.resolve('./get_action_error_log'));
    });
  });
}
