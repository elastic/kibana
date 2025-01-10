/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';

import { SAVE_BUTTON_LABEL } from '../../../../../shared/constants';
import { docLinks } from '../../../../../shared/doc_links';
import { UnsavedChangesPrompt } from '../../../../../shared/unsaved_changes_prompt';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV, RESET_BUTTON } from '../../../../constants';
import {
  LEARN_MORE_LINK,
  SOURCE_FREQUENCY_DESCRIPTION,
  SOURCE_SYNC_FREQUENCY_TITLE,
  BLOCKED_TIME_WINDOWS_TITLE,
  SYNC_UNSAVED_CHANGES_MESSAGE,
} from '../../constants';
import { SourceLogic } from '../../source_logic';
import { SourceLayout } from '../source_layout';

import { BlockedWindows } from './blocked_window_tab';
import { SyncFrequency } from './sync_frequency_tab';
import { SynchronizationLogic, TabId } from './synchronization_logic';

interface FrequencyProps {
  tabId: number;
}

export const Frequency: React.FC<FrequencyProps> = ({ tabId }) => {
  const { contentSource } = useValues(SourceLogic);
  const { hasUnsavedFrequencyChanges, navigatingBetweenTabs } = useValues(
    SynchronizationLogic({ contentSource })
  );
  const { handleSelectedTabChanged, resetSyncSettings, updateFrequencySettings } = useActions(
    SynchronizationLogic({ contentSource })
  );

  const tabs = [
    {
      id: 'source_sync_frequency',
      name: SOURCE_SYNC_FREQUENCY_TITLE,
      content: <SyncFrequency />,
    },
    {
      id: 'blocked_time_windows',
      name: BLOCKED_TIME_WINDOWS_TITLE,
      content: <BlockedWindows />,
    },
  ] as EuiTabbedContentTab[];

  const onSelectedTabChanged = (tab: EuiTabbedContentTab) => {
    handleSelectedTabChanged(tab.id as TabId);
  };

  const actions = (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButtonEmpty onClick={resetSyncSettings} disabled={!hasUnsavedFrequencyChanges}>
          {RESET_BUTTON}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton fill onClick={updateFrequencySettings} disabled={!hasUnsavedFrequencyChanges}>
          {SAVE_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <SourceLayout
      pageChrome={[
        NAV.SYNCHRONIZATION_FREQUENCY,
        tabId === 0 ? SOURCE_SYNC_FREQUENCY_TITLE : BLOCKED_TIME_WINDOWS_TITLE,
      ]}
      pageViewTelemetry="source_synchronization_frequency"
      isLoading={false}
    >
      <UnsavedChangesPrompt
        hasUnsavedChanges={!navigatingBetweenTabs && hasUnsavedFrequencyChanges}
        messageText={SYNC_UNSAVED_CHANGES_MESSAGE}
      />
      <ViewContentHeader
        title={NAV.SYNCHRONIZATION_FREQUENCY}
        description={
          <>
            {SOURCE_FREQUENCY_DESCRIPTION}{' '}
            <EuiLink href={docLinks.workplaceSearchIndexingSchedule} external>
              {LEARN_MORE_LINK}
            </EuiLink>
          </>
        }
        action={actions}
      />
      <EuiSpacer />
      <EuiTabbedContent tabs={tabs} selectedTab={tabs[tabId]} onTabClick={onSelectedTabChanged} />
    </SourceLayout>
  );
};
