/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Check whether user has kibana privileges to update Attack Discovery schedules
 */
export const useCanUpdateSchedule = (): boolean => {
  const { capabilities } = useKibana().services.application;
  return !!capabilities[ATTACK_DISCOVERY_FEATURE_ID]?.updateAttackDiscoverySchedule;
};
