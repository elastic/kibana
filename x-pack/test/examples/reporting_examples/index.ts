/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginFunctionalProviderContext } from '../../../../test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: PluginFunctionalProviderContext) {
  describe('reporting examples', function () {
    this.tags('ciGroup13');

    loadTestFile(require.resolve('./capture_test'));
  });
}
