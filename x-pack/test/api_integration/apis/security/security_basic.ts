/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('security (basic license)', function () {
    this.tags('ciGroup6');

    // Updates here should be mirrored in `./index.js` if tests
    // should also run under a trial/platinum license.

    loadTestFile(require.resolve('./api_keys'));
    loadTestFile(require.resolve('./basic_login'));
    loadTestFile(require.resolve('./builtin_es_privileges'));
    loadTestFile(require.resolve('./change_password'));
    loadTestFile(require.resolve('./index_fields'));
    loadTestFile(require.resolve('./roles'));
    loadTestFile(require.resolve('./privileges_basic'));
    loadTestFile(require.resolve('./session'));
  });
}
