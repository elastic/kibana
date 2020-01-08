/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ loadTestFile }) {
  describe('embeddable', function() {
    loadTestFile(require.resolve('./dashboard'));
    loadTestFile(require.resolve('./embeddable_state'));
    loadTestFile(require.resolve('./tooltip_filter_actions'));
  });
}
