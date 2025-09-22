/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import { getAllSecurityModules } from '../entity/utils/security_modules';

/**
 * Creates an event.kind filter for Resolver queries.
 *
 * This filter includes:
 * - All native events (event.kind: "event") - essential for process tree integrity
 * - Security alerts from relevant modules (event.kind: "alert" + module filter)
 *
 * This approach maintains complete process trees while reducing noise from
 * irrelevant alerts
 *
 * @returns Elasticsearch bool query for event.kind filtering
 */
export function createEventKindFilter(): JsonObject {
  const securityModules = getAllSecurityModules();

  return {
    bool: {
      should: [
        // Include all native events - critical for process tree integrity
        {
          term: { 'event.kind': 'event' },
        },
        // Include security alerts from relevant modules only
        {
          bool: {
            must: [
              { term: { 'event.kind': 'alert' } },
              { terms: { 'event.module': securityModules } },
            ],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
}
