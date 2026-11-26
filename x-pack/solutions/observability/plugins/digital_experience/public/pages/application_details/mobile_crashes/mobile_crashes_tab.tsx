/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { MOBILE_CRASHES_EBT_ELEMENTS } from '../../../ebt_constants';
import { useQueryParam } from '../../../hooks/use_query_param';
import { MobileToolbar, useMobileFilters } from '../mobile_overview/mobile_toolbar';
import type { MobileKpisState } from '../mobile_overview/use_mobile_kpis';
import { MobileCrashFlyout } from './mobile_crash_flyout';
import { MobileCrashGroupsTable } from './mobile_crash_groups_table';
import { useMobileCrashGroups } from './use_mobile_crash_groups';

const LOAD_ERROR_TITLE = i18n.translate('xpack.digitalExperience.mobile.crashes.loadError', {
  defaultMessage: 'Could not load the crashes',
});

const PARTIAL_ACCESS_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.partialAccess',
  {
    defaultMessage:
      "You can't read all of the mobile logs and traces indices, so crashes may be missing and the New badges may be wrong. Ask an administrator for read access to them.",
  }
);

const NO_CRASHES_TITLE = i18n.translate('xpack.digitalExperience.mobile.crashes.empty.title', {
  defaultMessage: 'No crashes',
});

const NO_CRASHES_BODY = i18n.translate('xpack.digitalExperience.mobile.crashes.empty.body', {
  defaultMessage:
    'EDOT Android and EDOT iOS reported no crash for this application in the selected time range. A crash is sent when the app is opened again.',
});

const NO_MATCHES_BODY = i18n.translate('xpack.digitalExperience.mobile.crashes.noMatches.body', {
  defaultMessage:
    'No crash of this application matches the selected environment, OS and release. Clear the filters, or try a wider time range.',
});

/**
 * The Crashes tab of a mobile application's page: the toolbar its tabs share, and the crash
 * groups of the URL's range and filters.
 */
export function MobileCrashesTab({
  serviceName,
  kpisState,
}: {
  serviceName: string;
  /** Fetched by the page: the filter options and the environments. */
  kpisState: MobileKpisState;
}) {
  const { response, lastResponse, isLoading, error, refresh } = useMobileCrashGroups(serviceName);
  const { isFiltered, clearFiltersButton } = useMobileFilters();
  // In the URL, so a reload or a shared link reopens the group's detail.
  const { value: crashGroup, setValue: setCrashGroup } = useQueryParam('crashGroup');
  const refreshAll = () => {
    kpisState.refresh();
    refresh();
  };

  const renderContent = () => {
    if (error) {
      return (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceMobileCrashesError"
          retryDataTestSubj="digitalExperienceMobileCrashesRetry"
          retryEbtElement={MOBILE_CRASHES_EBT_ELEMENTS.RETRY}
          title={LOAD_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      );
    }
    if (response && response.crashGroups.length === 0) {
      return (
        <EuiEmptyPrompt
          data-test-subj="digitalExperienceMobileCrashesEmpty"
          iconType={isFiltered ? 'magnify' : 'check'}
          titleSize="s"
          title={<h2>{NO_CRASHES_TITLE}</h2>}
          body={<p>{isFiltered ? NO_MATCHES_BODY : NO_CRASHES_BODY}</p>}
          actions={clearFiltersButton}
        />
      );
    }
    return (
      <MobileCrashGroupsTable
        crashGroups={response?.crashGroups ?? []}
        isLoading={isLoading}
        onSelect={setCrashGroup}
      />
    );
  };

  return (
    <>
      <MobileToolbar
        kpis={kpisState.kpis}
        isLoading={isLoading || kpisState.isLoading}
        onRefresh={refreshAll}
      />
      <EuiSpacer size="m" />
      {!error && response?.isPartial && (
        <>
          <KbnWarningCallout
            data-test-subj="digitalExperienceMobileCrashesPartialAccess"
            size="s"
            title={PARTIAL_ACCESS_TITLE}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {renderContent()}
      {crashGroup && (
        <MobileCrashFlyout
          serviceName={serviceName}
          fingerprint={crashGroup}
          // The last list, so the header keeps its counts while the list refreshes.
          group={lastResponse?.crashGroups.find(({ fingerprint }) => fingerprint === crashGroup)}
          onClose={() => setCrashGroup(undefined)}
        />
      )}
    </>
  );
}
