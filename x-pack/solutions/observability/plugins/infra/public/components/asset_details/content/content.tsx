/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { capitalize } from 'lodash';
import React from 'react';
import { DatePicker } from '../date_picker/date_picker';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import {
  Anomalies,
  Dashboards,
  Logs,
  Metadata,
  Metrics,
  Osquery,
  Overview,
  Processes,
  Profiling,
} from '../tabs';
import { LogsSearchBarHeader } from '../tabs/logs/logs_search_bar_header';
import { MetadataSearchBarHeader } from '../tabs/metadata/metadata_search_bar_header';
import { ProcessesSearchBarHeader } from '../tabs/processes/processes_search_bar_header';
import { DATE_PICKER_VISIBLE_TABS } from '../constants';
import { ContentTabIds } from '../types';
import { Callouts } from './callouts';

const SEARCH_BAR_TABS = [ContentTabIds.LOGS, ContentTabIds.METADATA, ContentTabIds.PROCESSES];

export const Content = ({
  showDatePicker = true,
  showProfilingSearchBar = true,
  showTabSearchBar = true,
}: {
  showDatePicker?: boolean;
  showProfilingSearchBar?: boolean;
  showTabSearchBar?: boolean;
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <Callouts />
      </EuiFlexItem>
      {showTabSearchBar && (
        <EuiFlexItem grow={false}>
          <TabSearchBarWrapper />
        </EuiFlexItem>
      )}
      {showDatePicker && (
        <EuiFlexItem grow={false}>
          <DatePickerWrapper />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <TabPanel activeWhen={ContentTabIds.ANOMALIES}>
          <Anomalies />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.OVERVIEW}>
          <Overview />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.LOGS}>
          <Logs />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.METADATA}>
          <Metadata />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.METRICS}>
          <Metrics />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.OSQUERY}>
          <Osquery />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.PROCESSES}>
          <Processes />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.PROFILING}>
          <Profiling showSearchBar={showProfilingSearchBar} />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.DASHBOARDS}>
          <Dashboards />
        </TabPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const TabSearchBarWrapper = () => {
  const { activeTabId } = useTabSwitcherContext();

  if (!SEARCH_BAR_TABS.includes(activeTabId as ContentTabIds)) {
    return null;
  }

  return (
    <>
      <div hidden={activeTabId !== ContentTabIds.LOGS}>
        <LogsSearchBarHeader />
      </div>
      <div hidden={activeTabId !== ContentTabIds.METADATA}>
        <MetadataSearchBarHeader />
      </div>
      <div hidden={activeTabId !== ContentTabIds.PROCESSES}>
        <ProcessesSearchBarHeader />
      </div>
    </>
  );
};

const DatePickerWrapper = () => {
  const { activeTabId } = useTabSwitcherContext();

  return (
    <div hidden={!DATE_PICKER_VISIBLE_TABS.includes(activeTabId as ContentTabIds)}>
      <DatePicker />
    </div>
  );
};

const TabPanel = ({
  activeWhen,
  children,
}: {
  activeWhen: ContentTabIds;
  children: React.ReactNode;
}) => {
  const { renderedTabsSet, activeTabId } = useTabSwitcherContext();

  // The logs tab is a special case because it is not rendered in the DOM until it is clicked due to performance reasons.
  if (activeWhen === ContentTabIds.LOGS && activeTabId === activeWhen) {
    return <div data-test-subj={makeTabPanelDataTestSubj({ tabId: activeWhen })}>{children}</div>;
  }

  return renderedTabsSet.current.has(activeWhen) ? (
    <div
      hidden={activeTabId !== activeWhen}
      data-test-subj={makeTabPanelDataTestSubj({ tabId: activeWhen })}
    >
      {children}
    </div>
  ) : null;
};

function makeTabPanelDataTestSubj({ tabId }: { tabId: ContentTabIds }) {
  return `infraAssetDetails${capitalize(tabId)}TabContent`;
}
