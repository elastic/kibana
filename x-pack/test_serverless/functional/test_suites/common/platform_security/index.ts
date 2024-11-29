/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Serverless Common UI - Platform Security', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./api_keys'));
    loadTestFile(require.resolve('./navigation/avatar_menu'));
    loadTestFile(require.resolve('./navigation/management_nav_cards'));
    loadTestFile(require.resolve('./user_profiles/user_profiles'));
    loadTestFile(require.resolve('./roles.ts'));
  });
}
