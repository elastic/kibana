/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Integration } from '../../../../../../common/api/detection_engine/fleet_integrations/model/integrations';

/**
 * Sorts integrations in place
 */
export function sortIntegrationsByStatus(integration: Integration[]): void {
  integration.sort((a, b) => {
    if (a.is_enabled && !b.is_enabled) {
      return -1;
    } else if (!a.is_enabled && b.is_enabled) {
      return 1;
    }

    if (a.is_installed && !b.is_installed) {
      return -1;
    } else if (!a.is_installed && b.is_installed) {
      return 1;
    }

    return 0;
  });
}
