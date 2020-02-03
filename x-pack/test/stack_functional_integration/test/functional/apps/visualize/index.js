/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ loadTestFile, getService }) {
  const browser = getService('browser');

  before(async () => {
    await browser.setWindowSize(1200, 800);
  });

  describe('visualize app', function() {
    loadTestFile(require.resolve('./_chart_types'));
    loadTestFile(require.resolve('./_area_chart'));
    loadTestFile(require.resolve('./_line_chart'));
    loadTestFile(require.resolve('./_data_table'));
    loadTestFile(require.resolve('./_metric_chart'));
    loadTestFile(require.resolve('./_pie_chart'));
    loadTestFile(require.resolve('./_tile_map'));
    loadTestFile(require.resolve('./_vertical_bar_chart'));
  });
}
