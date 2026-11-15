/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ALERT_ENTITY_TYPES } from '../../../../common/workflows/step_types/get_alert_entities_step/get_alert_entities_step_common';

export type AlertEntityType = (typeof ALERT_ENTITY_TYPES)[number];

/** One entity a type's aggregation found, before the types are merged and bounded. */
export interface FoundAlertEntity {
  /** How many of the alerts reference the entity. */
  count: number;
  id: string;
  /** From the entity's most recent alert; undefined when that alert has none. */
  name: string | undefined;
  type: AlertEntityType;
}

/** What one type's aggregation found. */
export interface FoundAlertEntities {
  entities: FoundAlertEntity[];
  /** How many distinct entities of the type the alerts reference. */
  total: number;
}
