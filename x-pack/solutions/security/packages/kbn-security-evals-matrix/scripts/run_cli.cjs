/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// CLI entry for the `matrix` command.

if (process.env.KBN_PEGGY_REQUIRE_HOOK_LOG == null) {
  process.env.KBN_PEGGY_REQUIRE_HOOK_LOG = 'false';
}
require('@kbn/setup-node-env');
void require('../src/cli').run();
