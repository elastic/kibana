/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }: { loadTestFile: (file: string) => void }) {
  /*
   * This test provides a test framework for spawning multiple concurrent tasks in
   * Task Manager and measuring how well Task Manager performs in claiming, processing
   * and finalising these tasks.
   *
   * We keep this test disabled as it is used on an ad hoc basis and we feel it is
   * worth keeping around for future use, rather than being rewritten time and time again.
   */
  describe.skip('task_manager_perf', function taskManagerSuite() {
    this.tags('ciGroup2');
    loadTestFile(require.resolve('./task_manager_perf_integration'));
  });
}
