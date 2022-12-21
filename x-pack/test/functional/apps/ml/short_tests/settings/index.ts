/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('settings', function () {
    this.tags(['ml', 'skipFirefox']);

    loadTestFile(require.resolve('./calendar_creation'));
    loadTestFile(require.resolve('./calendar_edit'));
    loadTestFile(require.resolve('./calendar_delete'));

    loadTestFile(require.resolve('./filter_list_creation'));
    loadTestFile(require.resolve('./filter_list_edit'));
    loadTestFile(require.resolve('./filter_list_delete'));
  });
}
