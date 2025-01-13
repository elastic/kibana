/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '../../../setup';

// eslint-disable-next-line import/no-default-export
export default function maintenanceWindowTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Maintenance Window - Group 3', () => {
    describe('maintenance window', () => {
      before(async () => {
        await setupSpacesAndUsers(getService);
      });

      after(async () => {
        await tearDown(getService);
      });

      loadTestFile(require.resolve('./get_maintenance_window'));
      loadTestFile(require.resolve('./create_maintenance_window'));
      loadTestFile(require.resolve('./update_maintenance_window'));
      loadTestFile(require.resolve('./delete_maintenance_window'));
      loadTestFile(require.resolve('./archive_maintenance_window'));
      loadTestFile(require.resolve('./finish_maintenance_window'));
      loadTestFile(require.resolve('./find_maintenance_windows'));
      loadTestFile(require.resolve('./active_maintenance_windows'));
    });
  });
}
