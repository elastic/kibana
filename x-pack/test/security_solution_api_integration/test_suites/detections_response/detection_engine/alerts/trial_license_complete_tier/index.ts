/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Alerts APIs - Trial License/Complete Tier', function () {
    loadTestFile(require.resolve('./aliases'));
    loadTestFile(require.resolve('./create_index'));
    loadTestFile(require.resolve('./alerts_compatibility'));
    loadTestFile(require.resolve('./migrations'));
    loadTestFile(require.resolve('./open_close_alerts'));
    loadTestFile(require.resolve('./set_alert_tags'));
    loadTestFile(require.resolve('./assignments'));
    loadTestFile(require.resolve('./query_alerts'));
  });
}
