/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {

  describe('users app', function () {
    loadTestFile(require.resolve('./_users'));
    loadTestFile(require.resolve('./_secure_roles_perm'));
    loadTestFile(require.resolve('./_roles_dls'));
    loadTestFile(require.resolve('./_roles_fls'));
  });
};
