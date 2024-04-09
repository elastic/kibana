/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Detection Engine - Execution logic', function () {
    loadTestFile(require.resolve('./eql'));
    loadTestFile(require.resolve('./esql'));
    loadTestFile(require.resolve('./machine_learning'));
    loadTestFile(require.resolve('./new_terms'));
    loadTestFile(require.resolve('./new_terms_alert_suppression'));
    loadTestFile(require.resolve('./saved_query'));
    loadTestFile(require.resolve('./threat_match'));
    loadTestFile(require.resolve('./threat_match_alert_suppression'));
    loadTestFile(require.resolve('./threshold'));
    loadTestFile(require.resolve('./threshold_alert_suppression'));
    loadTestFile(require.resolve('./non_ecs_fields'));
    loadTestFile(require.resolve('./query'));
  });
};
