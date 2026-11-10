/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_OUTCOME, SERVICE_NAME, SESSION_ID, URL_FULL } from '@kbn/apm-types';
import {
  WEB_VITAL_NAME,
  WEB_VITAL_VALUE,
  attributeField,
  resourceAttributeField,
} from '../../common/otel_data';

/** EDOT Browser re-stamps `session.id` on every span and log after rotation. */
export const SOURCE_SESSION_ID_FIELD = attributeField(SESSION_ID);
export const SOURCE_SERVICE_NAME_FIELD = resourceAttributeField(SERVICE_NAME);
export const SOURCE_URL_FIELD = attributeField(URL_FULL);
export const SOURCE_EVENT_OUTCOME_FIELD = attributeField(EVENT_OUTCOME);
export const SOURCE_WEB_VITAL_NAME_FIELD = attributeField(WEB_VITAL_NAME);
export const SOURCE_WEB_VITAL_VALUE_FIELD = attributeField(WEB_VITAL_VALUE);
