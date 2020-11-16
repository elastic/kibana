/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('transform basic license', function () {
    this.tags(['transform']);

    // The transform UI should work the same as with a trial license
    loadTestFile(require.resolve('../../../api_integration/apis/transform'));
  });
}
