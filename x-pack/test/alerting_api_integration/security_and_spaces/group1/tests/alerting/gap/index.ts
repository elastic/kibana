/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function gapsTests({ loadTestFile }: FtrProviderContext) {
  describe('rule gaps', () => {
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./update_gaps'));
    loadTestFile(require.resolve('./get_rules_with_gaps'));
    loadTestFile(require.resolve('./get_gaps_summary_by_rule_ids'));
    loadTestFile(require.resolve('./fill_gap_by_id'));
  });
}
