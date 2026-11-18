/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NAME, SESSION_ID, URL_FULL } from '@kbn/apm-types';
import {
  WEB_VITAL_NAME,
  WEB_VITAL_VALUE,
  attributeField,
  resourceAttributeField,
} from '../../../common/otel_data';

/**
 * Fields by their stored names, which the session summaries group on so that a scope mapping the
 * same name can't change which value a session is keyed on. EDOT Browser re-stamps `session.id` on
 * every span and log after rotation.
 */
export const SOURCE_SESSION_ID_FIELD = attributeField(SESSION_ID);
export const SOURCE_SERVICE_NAME_FIELD = resourceAttributeField(SERVICE_NAME);
export const SOURCE_URL_FIELD = attributeField(URL_FULL);
export const SOURCE_WEB_VITAL_NAME_FIELD = attributeField(WEB_VITAL_NAME);
export const SOURCE_WEB_VITAL_VALUE_FIELD = attributeField(WEB_VITAL_VALUE);
