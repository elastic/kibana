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
  describe('Alerts - Group 1', () => {
    describe('alerts', () => {
      before(async () => {
        await setupSpacesAndUsers(getService);
      });

      after(async () => {
        await tearDown(getService);
      });

      loadTestFile(require.resolve('./find'));
      loadTestFile(require.resolve('./find_with_post'));
      loadTestFile(require.resolve('./create'));
      loadTestFile(require.resolve('./delete'));
      loadTestFile(require.resolve('./disable'));
      loadTestFile(require.resolve('./enable'));
      loadTestFile(require.resolve('./execution_status'));
      loadTestFile(require.resolve('./get'));
      loadTestFile(require.resolve('./get_alert_state'));
      loadTestFile(require.resolve('./get_alert_summary'));
      loadTestFile(require.resolve('./rule_types'));
      loadTestFile(require.resolve('./retain_api_key'));
      loadTestFile(require.resolve('./bulk_untrack'));
      loadTestFile(require.resolve('./bulk_untrack_by_query'));
    });
  });
}
