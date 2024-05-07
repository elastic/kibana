/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../test/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Triggers Actions UI Example', function () {
    loadTestFile(require.resolve('./rule_status_dropdown'));
    loadTestFile(require.resolve('./rule_tag_filter'));
    loadTestFile(require.resolve('./rule_status_filter'));
    loadTestFile(require.resolve('./rule_tag_badge'));
    loadTestFile(require.resolve('./rule_event_log_list'));
    loadTestFile(require.resolve('./global_rule_event_log_list'));
    loadTestFile(require.resolve('./rules_list'));
    loadTestFile(require.resolve('./rules_settings_link'));
  });
};
