/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ProfilingSetupStatusResponse {
  has_setup: boolean;
  has_data: boolean;
  pre_8_9_1_data: boolean;
  has_required_role: boolean;
  unauthorized?: boolean;
}
