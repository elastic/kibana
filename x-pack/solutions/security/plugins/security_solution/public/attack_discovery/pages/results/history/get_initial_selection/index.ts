/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

export const getInitialSelection = (
  attackDiscoveries: AttackDiscoveryAlert[]
): Record<string, boolean> =>
  attackDiscoveries.reduce<Record<string, boolean>>(
    (acc, attackDiscovery) => ({
      ...acc,
      [attackDiscovery.id]: false,
    }),
    {}
  );
