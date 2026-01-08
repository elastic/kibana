/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


// file dedicated to hold tasks interfaces

import { EntityType } from "./definitions/entity_type"


export interface Task {
  schedule(entityType: EntityType): Promise<void>
  stopSchedule(type: EntityType): void
}