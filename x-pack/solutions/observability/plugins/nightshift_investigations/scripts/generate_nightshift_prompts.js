/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Writes the bundled investigator prompts as the saved objects of the `nightshift_prompts` package.
 * Usage: node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/generate_nightshift_prompts.js [--help]
 */

require('@kbn/setup-node-env');
require('./prompts_package/generate_nightshift_prompts_cli');
