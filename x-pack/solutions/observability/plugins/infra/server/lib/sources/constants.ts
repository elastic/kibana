/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityTypes } from '../../../common/http_api/shared/entity_type';
import { HOST_METRICS_RECEIVER_OTEL, SYSTEM_INTEGRATION } from '../../../common/constants';

export const integrationNameByEntityType: Record<EntityTypes, { beats: string; otel: string }> = {
  host: {
    beats: SYSTEM_INTEGRATION,
    otel: HOST_METRICS_RECEIVER_OTEL,
  },
};
