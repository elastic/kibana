/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroAutonomyLevel, AlertZeroAutonomyMode } from '../constants';

/**
 * Collapses the autonomy dial to whether a human gates the Worker's actions. Mirrors the review
 * workflows, which request `auto_approve` exactly when the autonomy level is `supervised`.
 */
export const deriveAutonomyMode = (level: AlertZeroAutonomyLevel): AlertZeroAutonomyMode =>
  level === 'supervised' ? 'auto_accept' : 'gated';
