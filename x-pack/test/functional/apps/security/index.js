/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('security app', function () {
    loadTestFile(require.resolve('./security'));
    loadTestFile(require.resolve('./doc_level_security_roles'));
    loadTestFile(require.resolve('./management'));
    loadTestFile(require.resolve('./users'));
    loadTestFile(require.resolve('./secure_roles_perm'));
    loadTestFile(require.resolve('./field_level_security'));
  });
}
