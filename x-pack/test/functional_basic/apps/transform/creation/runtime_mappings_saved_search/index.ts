/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('transform basic license', function () {
    this.tags(['skipFirefox', 'transform', 'skipFIPS']);

    // The transform UI should work the same as with a trial license
    loadTestFile(
      require.resolve(
        '../../../../../functional/apps/transform/creation/runtime_mappings_saved_search'
      )
    );
  });
}
