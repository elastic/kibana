/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseListsConfigReturn } from './use_lists_config';

export const getUseListsConfigMock: () => jest.Mocked<UseListsConfigReturn> = () => ({
  canManageIndex: null,
  canWriteIndex: null,
  enabled: true,
  loading: false,
  needsConfiguration: false,
  needsIndex: false,
  canCreateIndex: false,
});
