/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';

export default function ({ loadTestFile }: FtrProviderContextWithSpaces) {
  describe('@ess @serverless @serverlessQA SecuritySolution Timeline', () => {
    loadTestFile(require.resolve('./events'));
    loadTestFile(require.resolve('./timeline_details'));
    loadTestFile(require.resolve('./timeline'));
    loadTestFile(require.resolve('./timeline_migrations'));
    loadTestFile(require.resolve('./import_timelines'));
    loadTestFile(require.resolve('./install_prepackaged_timelines'));
  });
}
