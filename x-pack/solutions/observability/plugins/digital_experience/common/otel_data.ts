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
 * scope that maps it; the session summaries group by the stored fields so that a scope mapping
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
export const EVENT_RESOURCE_TIMING = 'browser.resource_timing';

/** Page loads and in-app navigations, which sessions count as page views. */
export const PAGE_VIEW_EVENTS = [EVENT_DOCUMENT_LOAD, EVENT_NAVIGATION] as const;
export const CLICK_EVENTS = [EVENT_CLICK, EVENT_USER_ACTION_CLICK] as const;

/** Fields of the browser events, not in `@kbn/apm-types`. */
export const EXCEPTION_STACKTRACE = 'exception.stacktrace';
export const RESOURCE_TIMING_DURATION = 'browser.resource_timing.duration';
export const RESOURCE_TIMING_INITIATOR_TYPE = 'browser.resource_timing.initiator_type';
export const RESOURCE_TIMING_RENDER_BLOCKING_STATUS =
  'browser.resource_timing.render_blocking_status';
export const RESOURCE_TIMING_TRANSFER_SIZE = 'browser.resource_timing.transfer_size';
export const RENDER_BLOCKING_STATUS_BLOCKING = 'blocking';
/**
 * The Resource Timing values, in milliseconds from the page's time origin, of resources and, on
 * `browser.navigation_timing` events, of the page document itself.
 */
export const RESOURCE_TIMING_FETCH_START = 'browser.resource_timing.fetch_start';
export const RESOURCE_TIMING_DOMAIN_LOOKUP_START = 'browser.resource_timing.domain_lookup_start';
export const RESOURCE_TIMING_DOMAIN_LOOKUP_END = 'browser.resource_timing.domain_lookup_end';
export const RESOURCE_TIMING_CONNECT_START = 'browser.resource_timing.connect_start';
export const RESOURCE_TIMING_CONNECT_END = 'browser.resource_timing.connect_end';
export const RESOURCE_TIMING_SECURE_CONNECTION_START =
  'browser.resource_timing.secure_connection_start';
export const RESOURCE_TIMING_REQUEST_START = 'browser.resource_timing.request_start';
export const RESOURCE_TIMING_RESPONSE_START = 'browser.resource_timing.response_start';
export const RESOURCE_TIMING_RESPONSE_END = 'browser.resource_timing.response_end';
export const RESOURCE_TIMING_DECODED_BODY_SIZE = 'browser.resource_timing.decoded_body_size';
export const RESOURCE_TIMING_ENCODED_BODY_SIZE = 'browser.resource_timing.encoded_body_size';
export const RESOURCE_TIMING_NEXT_HOP_PROTOCOL = 'browser.resource_timing.next_hop_protocol';
export const NAVIGATION_TIMING_DOM_CONTENT_LOADED_EVENT_END =
  'browser.navigation_timing.dom_content_loaded_event_end';
export const BROWSER_CSS_SELECTOR = 'browser.css_selector';
export const BROWSER_TAG_NAME = 'browser.tag_name';

/** Resource attributes describing the browser, as stored in the OTel indices. */

export const SPAN_KIND_CLIENT = 'Client';
export const SPAN_STATUS_ERROR = 'Error';
