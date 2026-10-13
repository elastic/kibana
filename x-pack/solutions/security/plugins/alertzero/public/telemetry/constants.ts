/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The AlertZero browser EBT event types, named `alertzero_ui_<object>_<verb>`. */
export const ALERTZERO_UI_EVENTS = {
  HomeOpened: 'alertzero_ui_home_opened',
  QueueFiltered: 'alertzero_ui_queue_filtered',
  BriefCardClicked: 'alertzero_ui_brief_card_clicked',
  ErrorShown: 'alertzero_ui_error_shown',
} as const;

export type AlertZeroUiEventType = (typeof ALERTZERO_UI_EVENTS)[keyof typeof ALERTZERO_UI_EVENTS];

/** Half-open ranges the queue's open count is reported in, so the count itself never ships. */
export const QUEUE_SIZE_BUCKETS = ['0', '1_10', '11_50', '51_200', 'gt_200'] as const;

export type QueueSizeBucket = (typeof QUEUE_SIZE_BUCKETS)[number];

/** The epic's queue filter and sort types. Only `impact` has a UI today. */
export const QUEUE_FILTER_TYPES = [
  'status',
  'assignee',
  'type',
  'time_range',
  'impact',
  'other',
] as const;

export type QueueFilterType = (typeof QUEUE_FILTER_TYPES)[number];

/** The conversations a brief card can open. Only the queue's `investigation` cards report today. */
export const BRIEF_CARD_CONVERSATION_TYPES = ['investigation', 'escalation'] as const;

export type BriefCardConversationType = (typeof BRIEF_CARD_CONVERSATION_TYPES)[number];

/**
 * Fixed error classes. HTTP failures map from the status code, never from the message; the rest
 * name what the AlertZero UI itself reports.
 */
export const UI_ERROR_CLASSES = [
  'network',
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'server',
  'partial_failure',
  'worker_scan_failed',
  'clipboard',
  'unknown',
] as const;

export type UiErrorClass = (typeof UI_ERROR_CLASSES)[number];

/** The AlertZero surfaces an error can be shown on. */
export const UI_ERROR_SURFACES = [
  'queue',
  'flyout',
  'onboarding',
  'watch_detail',
  'watch_settings',
  'escalations',
] as const;

export type UiErrorSurface = (typeof UI_ERROR_SURFACES)[number];
