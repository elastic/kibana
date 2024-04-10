/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Detection Engine - rule alert suppression logic', function () {
    loadTestFile(require.resolve('./custom_query_rule'));
    loadTestFile(require.resolve('./threat_match_alert_rule'));
    loadTestFile(require.resolve('./threshold_rule'));
  });
};
