/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function loadTests({ loadTestFile }) {
  describe('Agent policies', () => {
    loadTestFile(require.resolve('./agent_policy_with_agents_setup'));
    loadTestFile(require.resolve('./agent_policy'));
    loadTestFile(require.resolve('./agent_policy_datastream_permissions'));
    loadTestFile(require.resolve('./privileges'));
  });
}
