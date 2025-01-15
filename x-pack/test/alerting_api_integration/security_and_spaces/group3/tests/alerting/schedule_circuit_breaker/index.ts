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
  describe('Alerts - Group 3 - schedule circuit breaker', () => {
    describe('alerts', () => {
      before(async () => {
        await setupSpacesAndUsers(getService);
      });

      after(async () => {
        await tearDown(getService);
      });

      loadTestFile(require.resolve('./get_schedule_frequency'));
      loadTestFile(require.resolve('./create_with_circuit_breaker'));
      loadTestFile(require.resolve('./update_with_circuit_breaker'));
      loadTestFile(require.resolve('./enable_with_circuit_breaker'));
      loadTestFile(require.resolve('./bulk_enable_with_circuit_breaker'));
      loadTestFile(require.resolve('./bulk_edit_with_circuit_breaker'));
    });
  });
}
