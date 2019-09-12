/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function codeApp({ loadTestFile }: FtrProviderContext) {
  // FLAKY: https://github.com/elastic/kibana/issues/45094
  describe('Code', function codeAppTestSuite() {
    // Add 'skipCloud' regarding issue: https://github.com/elastic/kibana/issues/39386
    this.tags(['ciGroup2', 'skipCloud']);
    loadTestFile(require.resolve('./lang_server_coverage'));
    loadTestFile(require.resolve('./manage_repositories'));
    loadTestFile(require.resolve('./search'));
    loadTestFile(require.resolve('./explore_repository'));
    loadTestFile(require.resolve('./code_intelligence'));
    loadTestFile(require.resolve('./history'));
    loadTestFile(require.resolve('./file_tree'));
    loadTestFile(require.resolve('./with_security'));
  });
}
