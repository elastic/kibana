/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  OTEL_EVENT_NAME,
  SERVICE_NAME,
  SESSION_ID,
  URL_FULL,
} from '@kbn/apm-types';
import {
  BROWSER_CSS_SELECTOR,
  WEB_VITAL_NAME,
  WEB_VITAL_VALUE,
  attributeField,
  resourceAttributeField,
} from './otel_data';

/**
 * Fields by their stored names, which the session summaries and the frustration dashboard group on
 * so that a scope mapping the same name can't change which value a session is keyed on. EDOT
 * Browser re-stamps `session.id` on every span and log after rotation.
 */
export const SOURCE_EVENT_NAME_FIELD = OTEL_EVENT_NAME;
export const SOURCE_SESSION_ID_FIELD = attributeField(SESSION_ID);
export const SOURCE_SERVICE_NAME_FIELD = resourceAttributeField(SERVICE_NAME);
export const SOURCE_URL_FIELD = attributeField(URL_FULL);
export const SOURCE_CSS_SELECTOR_FIELD = attributeField(BROWSER_CSS_SELECTOR);
export const SOURCE_WEB_VITAL_NAME_FIELD = attributeField(WEB_VITAL_NAME);
export const SOURCE_WEB_VITAL_VALUE_FIELD = attributeField(WEB_VITAL_VALUE);
export const SOURCE_EXCEPTION_TYPE_FIELD = attributeField(EXCEPTION_TYPE);
export const SOURCE_EXCEPTION_MESSAGE_FIELD = attributeField(EXCEPTION_MESSAGE);

/** The version the application reports, a resource attribute of OpenTelemetry. */
export const SOURCE_APP_VERSION_FIELDS = [
  resourceAttributeField('service.version'),
  attributeField('service.version'),
] as const;

/**
 * Whether the browser runs on a mobile device. EDOT Browser records it even where no device model
 * or type is, so the device falls back to "Mobile" or "Desktop" rather than to nothing.
 */
export const SOURCE_MOBILE_FIELDS = [
  resourceAttributeField('browser.mobile'),
  attributeField('browser.mobile'),
] as const;
export const DEVICE_MOBILE_LABEL = 'Mobile';
export const DEVICE_DESKTOP_LABEL = 'Desktop';
