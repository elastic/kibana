/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createSpacesAndUsers, deleteSpacesAndUsers } from '../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('rules security and spaces enabled: basic', function () {
    before(async () => {
      await createSpacesAndUsers(getService);
    });

    after(async () => {
      await deleteSpacesAndUsers(getService);
    });

    // Basic
    // FAILING: https://github.com/elastic/kibana/issues/110153
    // loadTestFile(require.resolve('./get_alert_by_id'));
    // loadTestFile(require.resolve('./update_alert'));
    // loadTestFile(require.resolve('./bulk_update_alerts'));

    loadTestFile(require.resolve('./get_alerts_index'));
    loadTestFile(require.resolve('./find_alerts'));
    loadTestFile(require.resolve('./search_strategy'));
    loadTestFile(require.resolve('./get_browser_fields_by_rule_type_ids'));
    loadTestFile(require.resolve('./get_alert_summary'));
    loadTestFile(require.resolve('./get_aad_fields_by_rule_type'));
  });
};
