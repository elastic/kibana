/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  // TODO: The `scripts` folder was renamed to `scripts_tests` because the folder
  // name `scripts` triggers the `eslint@kbn/imports/no_boundary_crossing` rule
  describe('scripts', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./languages'));
  });
}
