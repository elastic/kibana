/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ping } from '../../../../../common/runtime_types';

/**
 * Checks if the loaded/cached pings are of the current selected monitors
 */
export function checkIsStalePing(monitorOrConfigId: string | undefined, ping: Ping | undefined) {
  if (!monitorOrConfigId || !ping?.monitor?.id) {
    return true;
  }

  return monitorOrConfigId !== ping.monitor.id && monitorOrConfigId !== ping.config_id;
}
