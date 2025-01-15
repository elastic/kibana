/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { buildUp, tearDown } from '../helpers';

// eslint-disable-next-line import/no-default-export
export default function actionsTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Actions', () => {
    before(async () => buildUp(getService));
    after(async () => tearDown(getService));

    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get_all_system'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./connector_types'));
    loadTestFile(require.resolve('./connector_types_system'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./monitoring_collection'));
    loadTestFile(require.resolve('./execute'));
    loadTestFile(require.resolve('./bulk_enqueue'));
    loadTestFile(require.resolve('./connector_types/stack/email'));
    loadTestFile(require.resolve('./connector_types/stack/email_html'));
    loadTestFile(require.resolve('./connector_types/stack/es_index'));
    loadTestFile(require.resolve('./connector_types/stack/webhook'));
    loadTestFile(require.resolve('./connector_types/stack/preconfigured_alert_history_connector'));
    loadTestFile(require.resolve('./type_not_enabled'));
    loadTestFile(require.resolve('./schedule_unsecured_action'));
    loadTestFile(require.resolve('./execute_unsecured_action'));
    loadTestFile(require.resolve('./get_all_unsecured_actions'));
    loadTestFile(require.resolve('./check_registered_connector_types'));
    loadTestFile(require.resolve('./max_queued_actions_circuit_breaker'));

    // note that this test will destroy existing spaces
    loadTestFile(require.resolve('./migrations'));
  });
}
