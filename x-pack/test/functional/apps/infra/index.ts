/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// tslint:disable-next-line:no-default-export
export default ({ loadTestFile }: KibanaFunctionalTestDefaultProviders) => {
  describe('InfraOps app', () => {
    loadTestFile(require.resolve('./home_page'));
  });
};
