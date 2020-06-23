/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('import_geojson', function () {
    loadTestFile(require.resolve('./add_layer_import_panel'));
    loadTestFile(require.resolve('./file_indexing_panel'));
  });
}
