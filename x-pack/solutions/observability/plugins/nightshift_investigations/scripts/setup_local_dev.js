/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Sets up a local Kibana for Nightshift investigations against the ORCA telemetry cluster.
 * Usage: node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/setup_local_dev.js [--help]
 */

require('@kbn/setup-node-env');
require('./local_dev/setup_local_dev_cli');
