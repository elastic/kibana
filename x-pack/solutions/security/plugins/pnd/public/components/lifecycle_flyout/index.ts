/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The four-phase lifecycle as an overlay.
 *
 * Callers (the HITL queue, the runs table, the chats view) need **only**
 * {@link useOpenLifecycle}: `LifecycleFlyoutHost` is already mounted above every PND route in
 * `components/app_chrome/app_chrome_layout`, and the overlay's state travels in the location's search
 * string rather than through context or props.
 *
 * The overlay has **two** tabs — Overview and Timeline — per decision 1 of the 2026-08-17
 * Experience/UX sync, and the active one travels in `?lifecycleTab=`. Each tab's panel carries
 * `data-test-subj="pndLifecyclePanel-{tabId}"` and each tab button
 * `data-test-subj="pndLifecycleTab-{tabId}"`, derived from the same ids in
 * {@link LIFECYCLE_TAB_IDS}.
 *
 * Overview is a composition of four **sections**, each of which owns its own read and carries
 * `data-test-subj="pndLifecycleSection-{sectionId}"`: `summary`, `attachments`, `tuning` and
 * `lifecycle`. The last three were tabs of their own until that decision — the ids are unchanged, so
 * a stale `?lifecycleTab=tuning` still names content that exists, and lands on Overview where it now
 * lives.
 */

export { LifecycleFlyout } from './lifecycle_flyout';
export type { LifecycleFlyoutProps } from './lifecycle_flyout';
export { LifecycleFlyoutHost } from './lifecycle_flyout_host';
export { useOpenLifecycle } from './use_open_lifecycle';
export {
  buildLifecycleSearch,
  buildLifecycleTabSearch,
  clearLifecycleSearch,
  DEFAULT_LIFECYCLE_TAB_ID,
  isLifecycleTabId,
  LIFECYCLE_FLYOUT_QUERY_PARAM,
  LIFECYCLE_FLYOUT_TAB_QUERY_PARAM,
  LIFECYCLE_TAB_IDS,
  readLifecycleAlertId,
  readLifecycleTabId,
} from './helpers/lifecycle_search_params';
export type { LifecycleTabId } from './helpers/lifecycle_search_params';
export { buildLifecycleTimeline } from './helpers/build_lifecycle_timeline';
export type { LifecycleTimelineEntry } from './helpers/build_lifecycle_timeline';
export { resolveCorrelationUnavailable } from './helpers/resolve_correlation_unavailable';
export { LIFECYCLE_PASSED_STATUSES, summarizeLifecycle } from './helpers/summarize_lifecycle';
export type { LifecycleStatusCount, LifecycleSummary } from './helpers/summarize_lifecycle';
export { LifecycleOverviewTab } from './tabs/overview_tab';
export type { LifecycleOverviewTabProps } from './tabs/overview_tab';
export { LifecycleTimelineTab } from './tabs/timeline_tab';
export type { LifecycleTimelineTabProps } from './tabs/timeline_tab';
export { LifecycleAttachmentsSection } from './sections/attachments_section';
export type { LifecycleAttachmentsSectionProps } from './sections/attachments_section';
export { LifecycleStepsSection } from './sections/lifecycle_section';
export type { LifecycleStepsSectionProps } from './sections/lifecycle_section';
export { LifecycleSummarySection } from './sections/summary_section';
export type { LifecycleSummarySectionProps } from './sections/summary_section';
export { LifecycleTuningSection } from './sections/tuning_section';
export type { LifecycleTuningSectionProps } from './sections/tuning_section';
export { resolveTuningEvidence } from './helpers/resolve_tuning_evidence';
export type { ResolvedTuningEvidence } from './helpers/resolve_tuning_evidence';
export { selectThreadConversations } from './helpers/select_thread_conversations';
