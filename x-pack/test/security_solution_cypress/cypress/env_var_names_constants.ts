/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

/**
 * The `CYPRESS_ELASTICSEARCH_USERNAME` environment variable specifies the
 * username to be used when authenticating with Kibana
 */
export const ELASTICSEARCH_USERNAME = 'ELASTICSEARCH_USERNAME';

/**
 * The `CYPRESS_ELASTICSEARCH_PASSWORD` environment variable specifies the
 * username to be used when authenticating with Kibana
 */
export const ELASTICSEARCH_PASSWORD = 'ELASTICSEARCH_PASSWORD';

/**
 * The `IS_SERVERLESS` environment variable specifies wether the currently running
 * environment is serverless snapshot.
 */
export const IS_SERVERLESS = 'IS_SERVERLESS';

/**
 * The `CLOUD_SERVERLESS` environment variable specifies wether the currently running
 * environment is a real MKI.
 */
export const CLOUD_SERVERLESS = 'CLOUD_SERVERLESS';

/**
 * The `DEFAULT_SERVERLESS_ROLE` environment variable specifies the default role used
 * on serverless tests/
 */
export const DEFAULT_SERVERLESS_ROLE = ROLES.platform_engineer;
