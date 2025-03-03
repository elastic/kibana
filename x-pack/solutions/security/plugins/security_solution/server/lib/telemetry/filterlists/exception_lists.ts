/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AllowlistFields } from './types';

export const exceptionListAllowlistFields: AllowlistFields = {
  created_at: true,
  effectScope: true,
  entries: true,
  id: true,
  name: true,
  os_types: true,
  rule_version: true,
  scope: true,
};
