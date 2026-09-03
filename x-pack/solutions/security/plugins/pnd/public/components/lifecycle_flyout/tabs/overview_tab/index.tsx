/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { LifecycleAttachmentsSection } from '../../sections/attachments_section';
import { LifecycleStepsSection } from '../../sections/lifecycle_section';
import { LifecycleSummarySection } from '../../sections/summary_section';
import { LifecycleTuningSection } from '../../sections/tuning_section';

export interface LifecycleOverviewTabProps {
  correlationId: string;
}

/**
 * Everything about one discovery that is not its chronology, on one scroll.
 *
 * **Decision 1** of the 2026-08-17 Experience/UX sync: *"Flyout goes to tabs: an Overview tab
 * (description, related items, fields table, attachments) and a separate Timeline tab"*. The flyout
 * carried five tabs before that decision, so three of them had to find a home; nothing was dropped,
 * and this is where they went:
 *
 * - **Attachments** is named by decision 1 itself as Overview content, so it folds without argument.
 * - **Review tuning** and **Lifecycle** are named by neither tab. They are ours, they have no
 *   case-flyout analogue to be merged into, and deleting either would lose a surface the design never
 *   asked us to lose — so they are sections here (register #49 records why neither is a mechanical
 *   merge, and that Review tuning is an *authorization* surface, which is why it keeps its own
 *   heading rather than being blended into the fields table).
 *
 * Ordered so that decision 1's own enumeration is intact — the fields table first, attachments last
 * of the four it names — and the two sections it does not name follow. Composition only: every
 * section owns its own read, its own empty state and its own tests, and this file owns nothing but
 * the order they appear in.
 *
 * ⚠️ Two sections that were tabs are now mounted **together**, where before only one could be. Each
 * reads a different react-query key (`executions.detail`, `conversations.list`,
 * `proposals.list`), so this costs three requests rather than one, not three copies of one — and
 * `LifecycleSummarySection` and `LifecycleStepsSection` share `executions.detail`, which is why they
 * cannot disagree about where the discovery is.
 */
export const LifecycleOverviewTab: React.FC<LifecycleOverviewTabProps> = ({ correlationId }) => (
  <div data-test-subj="pndLifecyclePanel-overview">
    <LifecycleSummarySection correlationId={correlationId} />

    <EuiHorizontalRule margin="m" />

    <LifecycleAttachmentsSection correlationId={correlationId} />

    <EuiHorizontalRule margin="m" />

    <LifecycleTuningSection correlationId={correlationId} />

    <EuiHorizontalRule margin="m" />

    <LifecycleStepsSection correlationId={correlationId} />
  </div>
);
