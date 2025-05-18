/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginsStart } from '../types';

export function isAgentlessEnabled(start: PluginsStart): boolean {
  return (start?.cloud?.isCloudEnabled ?? false) && (start.fleet?.agentless.enabled ?? false);
}
