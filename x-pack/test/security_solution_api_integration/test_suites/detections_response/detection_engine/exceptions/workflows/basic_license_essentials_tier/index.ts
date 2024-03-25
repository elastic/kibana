/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Detection Engine - Exception workflows APIs', function () {
    loadTestFile(require.resolve('./add_edit_comments_ess'));
    loadTestFile(require.resolve('./add_edit_comments_serverless'));
    loadTestFile(require.resolve('./create_endpoint_exceptions'));
    loadTestFile(require.resolve('./create_rule_exceptions_ess'));
    loadTestFile(require.resolve('./create_rule_exceptions'));
    loadTestFile(require.resolve('./exceptions_data_integrity'));
    loadTestFile(require.resolve('./find_rule_exception_references'));
    loadTestFile(require.resolve('./role_based_rule_exceptions_workflows'));
  });
}
