/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function canvasApp({ loadTestFile }) {
  describe('Canvas app', function canvasAppTestSuite() {
    this.tags('ciGroup2'); // CI requires tags ヽ(゜Q。)ノ？
    loadTestFile(require.resolve('./smoke_test'));
    loadTestFile(require.resolve('./feature_controls/canvas_security'));
    loadTestFile(require.resolve('./feature_controls/canvas_spaces'));
  });
}
