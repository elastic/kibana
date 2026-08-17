/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** OTel / EDOT Browser field paths (Elasticsearch OTel mapping mode). */

export const OTEL_SPAN_NAME = 'name';
export const OTEL_DOCUMENT_LOAD = 'documentLoad';
export const OTEL_LONGTASK = 'longtask';

export const OTEL_EVENT_NAME = 'event_name';
export const OTEL_EVENT_BROWSER_WEB_VITAL = 'browser.web_vital';
export const OTEL_EVENT_EXCEPTION = 'exception';
export const OTEL_EVENT_NAVIGATION = 'browser.navigation';
export const OTEL_EVENT_RAGE_CLICK = 'browser.frustration.rage_click';
export const OTEL_EVENT_DEAD_CLICK = 'browser.frustration.dead_click';
export const OTEL_EVENT_ERROR_CLICK = 'browser.frustration.error_click';
export const OTEL_EVENT_USER_ACTION_CLICK = 'browser.user_action.click';

export const OTEL_SERVICE_NAME = 'resource.attributes.service.name';
export const OTEL_SERVICE_ENVIRONMENT = 'resource.attributes.deployment.environment';
export const OTEL_BROWSER_NAME = 'resource.attributes.browser.name';
export const OTEL_BROWSER_OS = 'resource.attributes.browser.platform';
export const OTEL_RUM_PLATFORM = 'resource.attributes.rum.platform';
export const OTEL_OS_NAME = 'resource.attributes.os.name';
export const OTEL_OS_TYPE = 'resource.attributes.os.type';
export const OTEL_ATTR_RUM_PLATFORM = 'attributes.rum.platform';
export const OTEL_PAGE_URL = 'attributes.page.url';
export const OTEL_PAGE_PATH = 'attributes.page.url.path';
export const OTEL_HTTP_URL = 'attributes.http.url';
export const OTEL_URL_FULL = 'attributes.url.full';

export const OTEL_TRANSACTION_DURATION_US = 'attributes.transaction.duration.us';
export const OTEL_LONGTASK_DURATION = 'attributes.longtask.duration';

export const OTEL_WEB_VITAL_NAME = 'attributes.browser.web_vital.name';
export const OTEL_WEB_VITAL_VALUE = 'attributes.browser.web_vital.value';

export const OTEL_EXCEPTION_TYPE = 'attributes.exception.type';
export const OTEL_EXCEPTION_MESSAGE = 'attributes.exception.message';
export const OTEL_EXCEPTION_GROUPING = 'attributes.exception.type.keyword'; // may fall back to type field

/** EDOT Browser RUM lives on OTel traces + logs. Do not union the APM data view. */
export const UX_OTEL_INDEX_PATTERNS = ['traces-*.otel-*', 'logs-*.otel-*'] as const;

export const RUM_PAGE_LOAD_KQL =
  '(transaction.type: page-load and processor.event: transaction) or name: documentLoad';

export function uxSearchIndex(_dataViewTitle?: string): string {
  return UX_OTEL_INDEX_PATTERNS.join(',');
}
