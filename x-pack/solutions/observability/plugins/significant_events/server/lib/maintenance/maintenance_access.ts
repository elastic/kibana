/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Who a maintenance sweep acts as. `user` runs with the caller's request and
 * privileges (Pause/Resume from the API). `system` has no user request (e.g.
 * the Nightshift feature flag flipped) and must stick to internal clients.
 */
export type MaintenanceAccess = 'user' | 'system';
