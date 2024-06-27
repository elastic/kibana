/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import globby from 'globby';
import path from 'path';
import { createUsersAndRoles } from '../../observability_ai_assistant_api_integration/common/users/create_users_and_roles';
import { FtrProviderContext } from '../../observability_ai_assistant_api_integration/common/ftr_provider_context';

const cwd = path.join(__dirname);

export default function observabilityAIAssistantFunctionalTests({
  getService,
  loadTestFile,
}: FtrProviderContext) {
  describe('Observability AI Assistant Functional tests', function () {
    const filePattern = '**/*.spec.ts';
    const tests = globby.sync(filePattern, { cwd });

    // Creates roles and users before running tests
    before(async () => {
      await createUsersAndRoles(getService);
    });

    tests.forEach((testName) => {
      describe(testName, () => {
        loadTestFile(require.resolve(`./${testName}`));
      });
    });
  });
}
