/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Serverless Observability Cases', function () {
    loadTestFile(require.resolve('./attachment_framework'));
    loadTestFile(require.resolve('./view_case'));
    loadTestFile(require.resolve('./configure'));
    loadTestFile(require.resolve('./create_case_form'));
    loadTestFile(require.resolve('./list_view'));
  });
}
