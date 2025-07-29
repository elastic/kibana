/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap8190 } from '../8.19.0';
import { ACTOR_ENTITY_ID, RELATED_ENTITY, TARGET_ENTITY_ID } from '../field_names';

export const alertsFieldMap920 = {
  ...alertsFieldMap8190,
  /**
   * Part of audit logs fields that are now processed. These fields helps us present alerts and logs in a graphical way.
   * Both actor and target fields are a work in progress to become part of ECS.
   * Right now, these fields are only relevant for security's alerts and audit logs. Therefore, we add them here.
   */
  [ACTOR_ENTITY_ID]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [RELATED_ENTITY]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [TARGET_ENTITY_ID]: {
    type: 'keyword',
    array: true,
    required: false,
  },
} as const;

export type AlertsFieldMap920 = typeof alertsFieldMap920;
