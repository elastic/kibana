/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';

/**
 * Kibana Alerts feature read (alerts-read), required alongside Security feature access for
 * entity analytics enablement per documented requirements (Security read + Alerts read).
 * @see https://www.elastic.co/docs/solutions/security/advanced-entity-analytics/entity-risk-scoring-requirements
 */
export const ENTITY_ANALYTICS_ENABLEMENT_ALERTS_READ_API_PRIVILEGES = [ALERTS_API_READ] as const;
