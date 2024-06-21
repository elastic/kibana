/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function loadTests({ loadTestFile }) {
  describe('Space awareness', () => {
    loadTestFile(require.resolve('./enrollment_api_keys'));
    loadTestFile(require.resolve('./uninstall_tokens'));
    loadTestFile(require.resolve('./agent_policies'));
    loadTestFile(require.resolve('./agents'));
    loadTestFile(require.resolve('./enrollment_settings'));
  });
}
