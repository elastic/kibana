/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('embeddable', function () {
    loadTestFile(require.resolve('./add_to_dashboard'));
    loadTestFile(require.resolve('./save_and_return'));
    loadTestFile(require.resolve('./dashboard'));
    loadTestFile(require.resolve('./embeddable_library'));
    loadTestFile(require.resolve('./embeddable_state'));
    loadTestFile(require.resolve('./tooltip_filter_actions'));
    loadTestFile(require.resolve('./filter_by_map_extent'));
  });
}
