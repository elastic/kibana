/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless security UI', function () {
    loadTestFile(require.resolve('./ftr/landing_page'));
    loadTestFile(require.resolve('./ftr/navigation'));
    loadTestFile(require.resolve('./ftr/management'));
    loadTestFile(require.resolve('./ftr/cases/attachment_framework'));
    loadTestFile(require.resolve('./ftr/cases/view_case'));
    loadTestFile(require.resolve('./ftr/cases/create_case_form'));
    loadTestFile(require.resolve('./ftr/cases/configure'));
    loadTestFile(require.resolve('./ftr/cases/list_view'));
    loadTestFile(require.resolve('./advanced_settings'));
  });
}
