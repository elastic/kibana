/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('security app', function () {
    this.tags('ciGroup7');

    loadTestFile(require.resolve('./security'));
    loadTestFile(require.resolve('./doc_level_security_roles'));
    loadTestFile(require.resolve('./management'));
    loadTestFile(require.resolve('./users'));
    loadTestFile(require.resolve('./secure_roles_perm'));
    loadTestFile(require.resolve('./field_level_security'));
    loadTestFile(require.resolve('./user_email'));
    loadTestFile(require.resolve('./role_mappings'));
  });
}
