/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Detection Engine - Exception workflows APIs', function () {
    loadTestFile(require.resolve('./create_rule_exceptions'));
    loadTestFile(require.resolve('./create_rule_exceptions'));
    loadTestFile(require.resolve('./role_based_rule_exceptions_workflows'));
    loadTestFile(require.resolve('./create_endpoint_exceptions'));
    loadTestFile(require.resolve('./role_based_add_edit_comments'));
    loadTestFile(require.resolve('./rule_exception_synchronizations'));
  });
}
