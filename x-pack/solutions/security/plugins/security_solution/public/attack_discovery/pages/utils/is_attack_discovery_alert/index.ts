/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common/types/attack_discovery/common_attributes.gen';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common/types/attack_discovery/attack_discovery_alert.gen';

export const isAttackDiscoveryAlert = (
  obj: AttackDiscovery | AttackDiscoveryAlert
): obj is AttackDiscoveryAlert => 'generationUuid' in obj;
