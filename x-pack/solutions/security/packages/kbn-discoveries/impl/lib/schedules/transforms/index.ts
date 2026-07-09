/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub barrel: real schedule transforms land in PR10 (Schedule Integration).
// PR3 schedule routes need these symbols to type-check FF-off; runtime
// schedule routes are FF-gated and never reach this code with the FF OFF.

export { transformCreatePropsFromApi } from './transform_create_props_from_api';
export { transformScheduleToApi } from './transform_schedule_to_api';
export { transformUpdatePropsFromApi } from './transform_update_props_from_api';
