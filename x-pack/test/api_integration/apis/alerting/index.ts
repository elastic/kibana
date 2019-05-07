/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function alertingTests({ loadTestFile }: KibanaFunctionalTestDefaultProviders) {
  describe('Alerting', () => {
    loadTestFile(require.resolve('./create_action'));
    loadTestFile(require.resolve('./delete_action'));
    loadTestFile(require.resolve('./find_action'));
    loadTestFile(require.resolve('./get_action'));
    loadTestFile(require.resolve('./list_connectors'));
    loadTestFile(require.resolve('./update_action'));
  });
}
