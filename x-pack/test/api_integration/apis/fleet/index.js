/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function loadTests({ loadTestFile }) {
  describe('Fleet Endpoints', () => {
    loadTestFile(require.resolve('./delete_agent'));
    loadTestFile(require.resolve('./list_agent'));
    loadTestFile(require.resolve('./enroll_agent'));
    loadTestFile(require.resolve('./agent_checkin'));
    loadTestFile(require.resolve('./agent_actions'));
    loadTestFile(require.resolve('./get_enrollment_token'));
  });
}
