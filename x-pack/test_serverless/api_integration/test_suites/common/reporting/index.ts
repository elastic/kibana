/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Reporting', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./management'));
    loadTestFile(require.resolve('./generate_csv_discover'));
    loadTestFile(require.resolve('./download_csv_dashboard'));
  });
};
