/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Local indices only: remote clusters are not searched. */
export const OTEL_LOGS_INDEX = 'logs-*.otel-*';
export const OTEL_TRACES_INDEX = 'traces-*.otel-*';

/** `telemetry.sdk.language` of the browser SDKs; the OTel indices also hold backend services. */
export const BROWSER_SDK_LANGUAGE = 'webjs';

/**
 * An attribute as stored in the OTel indices, e.g. `attributes.session.id`. Queries can use the
 * unprefixed name, which the templates' passthrough objects resolve to the highest-priority
 * scope that maps it; the sessions transform groups by the stored fields so that a scope mapping
 * the same name can't change which value a session is keyed on.
 */
export const attributeField = (name: string): string => `attributes.${name}`;
/** A resource attribute as stored in the OTel indices, e.g. `resource.attributes.service.name`. */
export const resourceAttributeField = (name: string): string => `resource.attributes.${name}`;

/** Span name in the OTel traces indices; events are named in `event_name` instead. */
export const OTEL_SPAN_NAME = 'name';

export const WEB_VITAL_NAME = 'browser.web_vital.name';
export const WEB_VITAL_VALUE = 'browser.web_vital.value';

/** End of the load event, in milliseconds from the start of the navigation. */
export const NAVIGATION_TIMING_LOAD_EVENT_END = 'browser.navigation_timing.load_event_end';

/** EDOT Browser event names: an `event_name` in the logs, or a span name in the traces. */
export const EVENT_NAVIGATION_TIMING = 'browser.navigation_timing';
export const EVENT_WEB_VITAL = 'browser.web_vital';
export const EVENT_EXCEPTION = 'exception';
export const EVENT_DOCUMENT_LOAD = 'documentLoad';
export const EVENT_NAVIGATION = 'browser.navigation';
export const EVENT_CLICK = 'click';
export const EVENT_USER_ACTION_CLICK = 'browser.user_action.click';

export const SPAN_KIND_CLIENT = 'Client';
export const SPAN_STATUS_ERROR = 'Error';
