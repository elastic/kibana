/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiFlyoutBody, EuiSpacer } from '@elastic/eui';
import { LifecycleAttachmentsSection } from '../lifecycle_flyout/sections/attachments_section';
import { LifecycleSummarySection } from '../lifecycle_flyout/sections/summary_section';
import { LifecycleTuningSection } from '../lifecycle_flyout/sections/tuning_section';
import { LifecycleTimelineTab } from '../lifecycle_flyout/tabs/timeline_tab';
import { ConversationDetailsFlyoutTabs } from './details_flyout_tabs';
import type { FlyoutTab } from './details_flyout_tab_contents';

export interface ConversationDetailsFlyoutBodyProps {
  correlationId: string;
}

export const ConversationDetailsFlyoutBody = memo<ConversationDetailsFlyoutBodyProps>(
  ({ correlationId }) => {
    const [selectedTab, setSelectedTab] = useState<FlyoutTab>('overview');

    return (
      <EuiFlyoutBody>
        <ConversationDetailsFlyoutTabs
          correlationId={correlationId}
          onTabChange={setSelectedTab}
          selectedTab={selectedTab}
        />
        <EuiSpacer size="m" />
        {selectedTab === 'overview' && (
          <>
            <LifecycleSummarySection correlationId={correlationId} />
            <EuiSpacer size="m" />
            <LifecycleTuningSection correlationId={correlationId} />
          </>
        )}
        {selectedTab === 'attachments' && (
          <LifecycleAttachmentsSection correlationId={correlationId} />
        )}
        {selectedTab === 'timeline' && <LifecycleTimelineTab correlationId={correlationId} />}
      </EuiFlyoutBody>
    );
  }
);

ConversationDetailsFlyoutBody.displayName = 'ConversationDetailsFlyoutBody';
