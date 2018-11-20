/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// tslint:disable-next-line:no-default-export
export default ({ loadTestFile }: KibanaFunctionalTestDefaultProviders) => {
<<<<<<< HEAD
  describe('InfraOps app', () => {
=======
  describe('InfraOps app', function() {
    (this as any).tags('ciGroup4');

>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    loadTestFile(require.resolve('./home_page'));
  });
};
