/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';

export const getScheduledAndAdHocIndexPattern = (spaceId: string): string =>
  [
    `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`, // scheduled
    `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-ad-hoc-${spaceId}`, // ad-hoc
  ].join(',');
