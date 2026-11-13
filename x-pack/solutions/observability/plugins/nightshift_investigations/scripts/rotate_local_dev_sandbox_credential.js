/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Rotates the shared kibana-local-dev sandbox credential in the eval cluster and the dev Vault.
 * Usage: node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/rotate_local_dev_sandbox_credential.js [--help]
 */

require('@kbn/setup-node-env');
require('./local_dev/rotate_credential_cli');
