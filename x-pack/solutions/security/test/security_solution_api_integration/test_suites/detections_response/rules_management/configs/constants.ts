/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOGGING_CONFIG = [
  {
    name: 'plugins.securitySolution',
    level: 'debug',
  },
  {
    name: 'plugins.fleet',
    level: 'debug',
  },
];

/**
 * A log message indicating that Fleet plugin has completed any necessary setup logic
 * to make sure test suites can run without race conditions with Fleet plugin initialization.
 *
 * The message must not be filtered out by the logging configuration. Subsequently higher log level is better.
 * "Fleet setup completed" has the same "info" level as "Kibana server is ready" log message.
 */
export const FLEET_PLUGIN_READY_LOG_MESSAGE_REGEXP = /Fleet setup completed/;
