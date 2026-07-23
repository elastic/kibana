/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { ALERT_ATTACK_DISCOVERY_TITLE } from '@kbn/elastic-assistant-common';

/**
 * Returns the attack discovery's display title from the given hit, or `undefined` when not
 * present. Used to build flyout-history titles (via {@link formatFlyoutTitle}) for the attack
 * flyout and its tools.
 */
export const getAttackTitleValue = (hit: DataTableRecord): string | undefined =>
  getFieldValue(hit, ALERT_ATTACK_DISCOVERY_TITLE) as string | undefined;
