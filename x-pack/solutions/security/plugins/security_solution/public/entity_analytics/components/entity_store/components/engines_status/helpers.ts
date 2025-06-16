/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineStatus } from '../../../../../../common/api/entity_analytics/entity_store/common.gen';

export const isEngineLoading = (status: EngineStatus | undefined) =>
  status === 'updating' || status === 'installing';
