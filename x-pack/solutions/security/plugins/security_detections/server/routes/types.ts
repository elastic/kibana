/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared route types for the security_detections plugin.
 *
 * Defines the start-phase dependencies that route registration functions
 * receive via `CoreSetup.getStartServices()`.
 */

import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';

/**
 * Start-phase plugin dependencies.
 *
 * Used as the `TPluginsStart` generic on `CoreSetup` so that
 * `getStartServices()` resolves with the correct type for `alertingVTwo`.
 */
export interface DetectionsPluginStartDeps {
  alertingVTwo: AlertingServerStart;
}
