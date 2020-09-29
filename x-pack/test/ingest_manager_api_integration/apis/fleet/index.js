/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function loadTests({ loadTestFile }) {
  describe('Fleet Endpoints', () => {
    loadTestFile(require.resolve('./setup'));
    loadTestFile(require.resolve('./agents/delete'));
    loadTestFile(require.resolve('./agents/list'));
    loadTestFile(require.resolve('./agents/enroll'));
    loadTestFile(require.resolve('./agents/unenroll'));
    loadTestFile(require.resolve('./agents/checkin'));
    loadTestFile(require.resolve('./agents/events'));
    loadTestFile(require.resolve('./agents/acks'));
    loadTestFile(require.resolve('./agents/complete_flow'));
    loadTestFile(require.resolve('./enrollment_api_keys/crud'));
    loadTestFile(require.resolve('./install'));
    loadTestFile(require.resolve('./agents/actions'));
    loadTestFile(require.resolve('./agents/upgrade'));
    loadTestFile(require.resolve('./agents/reassign'));
  });
}
