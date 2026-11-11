/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSource } from '../../../common/types/applications';

/** Name of the APM span that traces each source's searches. */
export const SEARCH_SPAN_NAMES: Record<ApplicationSource, string> = {
  otel: 'get_digital_experience_otel_applications',
  classic: 'get_digital_experience_classic_applications',
};

/** Name of the APM span that traces the EDOT Browser search of the sessions index. */
export const SESSIONS_SEARCH_SPAN_NAME = 'get_digital_experience_otel_applications_from_sessions';

/** Maximum number of applications returned per source. */
export const MAX_APPLICATIONS_PER_SOURCE = 1000;

/** Maximum number of environments listed per application; keeps the bucket count bounded. */
export const MAX_ENVIRONMENTS_PER_APPLICATION = 10;
