/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ loadTestFile }: KibanaFunctionalTestDefaultProviders) {
  describe('feature controls', function() {
    this.tags('skipFirefox');
    loadTestFile(require.resolve('./dev_tools_security'));
    loadTestFile(require.resolve('./dev_tools_spaces'));
  });
}
