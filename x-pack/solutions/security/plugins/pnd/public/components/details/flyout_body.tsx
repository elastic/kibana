/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiFlyoutBody, EuiSpacer } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { AttachmentsTab, OverviewTab, TimelineTab } from './details_flyout_tab_contents';
import { ConversationDetailsFlyoutTabs } from './details_flyout_tabs';
import type { FlyoutTab } from './details_flyout_tab_contents';

export interface ConversationDetailsFlyoutBodyProps {
  investigation: Investigation;
}

export const ConversationDetailsFlyoutBody = memo<ConversationDetailsFlyoutBodyProps>(
  ({ investigation }) => {
    const [selectedTab, setSelectedTab] = useState<FlyoutTab>('overview');

    return (
      <EuiFlyoutBody>
        <ConversationDetailsFlyoutTabs
          investigation={investigation}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
        />
        <EuiSpacer size="m" />
        {selectedTab === 'overview' && <OverviewTab investigation={investigation} />}
        {selectedTab === 'attachments' && <AttachmentsTab />}
        {selectedTab === 'timeline' && <TimelineTab events={investigation.events} />}
      </EuiFlyoutBody>
    );
  }
);

ConversationDetailsFlyoutBody.displayName = 'ConversationDetailsFlyoutBody';
