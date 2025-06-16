/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Alerts and alerts index related logic - Basic License/Essentials Tier', function () {
    loadTestFile(require.resolve('./ess_specific_index_logic'));
    loadTestFile(require.resolve('./alert_status'));
    loadTestFile(require.resolve('./field_aliases'));
    loadTestFile(require.resolve('./query_alerts'));
    loadTestFile(require.resolve('./set_alert_tags'));
  });
}
