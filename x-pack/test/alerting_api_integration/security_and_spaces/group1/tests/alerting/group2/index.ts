/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../../setup';

// eslint-disable-next-line import/no-default-export
export default function alertingTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Alerts - Group 1 - subgroup 2', () => {
    describe('alerts', () => {
      before(async () => {
        await setupSpacesAndUsers(getService);
      });

      after(async () => {
        await tearDown(getService);
      });

      loadTestFile(require.resolve('./find_with_post')); // ~4m 40s
      loadTestFile(require.resolve('./create')); // ~1m 6s
      loadTestFile(require.resolve('./delete')); // ~2m 15s
      loadTestFile(require.resolve('./disable')); // ~2m
      loadTestFile(require.resolve('./enable')); // ~1m 30s
      loadTestFile(require.resolve('./execution_status')); // ~4s
      loadTestFile(require.resolve('./get')); // ~5m
      loadTestFile(require.resolve('./get_alert_state')); // ~1m 25s
      loadTestFile(require.resolve('./get_alert_summary')); // ~1m 25s
      loadTestFile(require.resolve('./rule_types')); // ~2s
      loadTestFile(require.resolve('./retain_api_key')); // ~30s
      loadTestFile(require.resolve('./bulk_untrack')); // ~50s
      loadTestFile(require.resolve('./bulk_untrack_by_query')); // ~55s
    });
  });
}
