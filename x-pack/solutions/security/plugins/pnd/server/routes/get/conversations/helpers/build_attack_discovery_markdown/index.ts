/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AttackDiscoveryApiAlert,
  getAttackDiscoveryMarkdown,
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';

/**
 * Render an Attack Discovery alert (public snake_case shape) to markdown, reusing the canonical
 * `getAttackDiscoveryMarkdown` renderer so the seeded conversation content stays identical to the
 * rest of the product. `transformAttackDiscoveryAlertFromApi` maps the API alert to the camelCase
 * shape the renderer expects; the `_find` route has already applied text replacements, so none are
 * passed here.
 */
export const buildAttackDiscoveryMarkdown = (alert: AttackDiscoveryApiAlert): string =>
  getAttackDiscoveryMarkdown({ attackDiscovery: transformAttackDiscoveryAlertFromApi(alert) });
