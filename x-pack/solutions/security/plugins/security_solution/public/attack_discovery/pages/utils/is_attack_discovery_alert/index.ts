/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

export const isAttackDiscoveryAlert = (
  obj: AttackDiscovery | AttackDiscoveryAlert
): obj is AttackDiscoveryAlert => 'generationUuid' in obj;
