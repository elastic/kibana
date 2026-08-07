/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHeaderSectionItemButton,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState, useMemo } from 'react';
import { MLJobsAwaitingNodeWarning, MlNodeAvailableWarningShared } from '@kbn/ml-plugin/public';
import { useKibana } from '../../lib/kibana';
import { filterJobs } from './helpers';
import { IntegrationJobsPanel } from './integration_jobs_panel';
import { JobUpdatesCallout } from './job_updates_callout';
import { JobsTableFilters } from './jobs_table/filters/jobs_table_filters';
import * as filtersI18n from './jobs_table/filters/translations';
import { JobsTable } from './jobs_table/jobs_table';
import { ShowingCount } from './jobs_table/showing_count';
import { PopoverDescription } from './popover_description';
import * as i18n from './translations';
import type { JobsFilters, MlJobsTab, SecurityJob } from './types';
import { UpgradeContents } from './upgrade_contents';
import { useSecurityJobs } from './hooks/use_security_jobs';
import { useEnableDataFeed } from './hooks/use_enable_data_feed';

const defaultFilterProps: JobsFilters = {
  filterQuery: '',
  showCustomJobs: false,
  showElasticJobs: true,
  selectedGroups: [],
  selectedTab: 'prebuilt',
};

export const MlPopover = React.memo(() => {
  const mlFlyoutTitleId = useGeneratedHtmlId();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [filterProperties, setFilterProperties] = useState(defaultFilterProps);
  const [selectedTab, setSelectedTab] = useState<MlJobsTab>('prebuilt');
  const [mlNodesAvailable, setMlNodesAvailable] = useState(false);

  const {
    isMlAdmin,
    isLicensed,
    loading: isLoadingSecurityJobs,
    jobs,
    integrationJobs,
    fleetModules,
    refetch: refreshJobs,
  } = useSecurityJobs();

  const docLinks = useKibana().services.docLinks;
  const {
    enableDatafeed,
    disableDatafeed,
    isLoading: isLoadingEnableDataFeed,
  } = useEnableDataFeed();
  const handleJobStateChange = useCallback(
    async (job: SecurityJob, latestTimestampMs: number, enable: boolean) => {
      if (enable) {
        await enableDatafeed(job, latestTimestampMs);
      } else {
        await disableDatafeed(job);
      }

      refreshJobs();
    },
    [refreshJobs, enableDatafeed, disableDatafeed]
  );

  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  const toggleFlyout = useCallback(() => {
    setIsFlyoutOpen((open) => !open);
  }, []);

  const handleTabChange = useCallback((tab: MlJobsTab) => {
    setSelectedTab(tab);
    setFilterProperties((current) => ({ ...current, selectedTab: tab }));
  }, []);

  const filteredJobs = filterJobs({
    jobs,
    ...filterProperties,
  });

  const incompatibleJobCount = jobs.filter((j) => !j.isCompatible).length;
  const installedJobsIds = useMemo(
    () => jobs.filter((j) => j.isInstalled).map((j) => j.id),
    [jobs]
  );

  if (!isLicensed) {
    // If the user does not have platinum show upgrade UI
    return (
      <>
        <EuiHeaderSectionItemButton
          aria-expanded={isFlyoutOpen}
          aria-haspopup="dialog"
          aria-label={i18n.ML_JOB_SETTINGS}
          color="primary"
          data-test-subj="integrations-button"
          onClick={toggleFlyout}
          textProps={{ style: { fontSize: '1rem' } }}
        >
          {i18n.ML_JOB_SETTINGS}
        </EuiHeaderSectionItemButton>
        {isFlyoutOpen && (
          <EuiFlyout size="s" onClose={closeFlyout} aria-labelledby={mlFlyoutTitleId} ownFocus>
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
                <h2 id={mlFlyoutTitleId}>{i18n.UPGRADE_TITLE}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <UpgradeContents />
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </>
    );
  } else if (isMlAdmin) {
    // If the user has Platinum License & ML Admin Permissions, show Anomaly Detection button & full config UI
    return (
      <>
        <EuiHeaderSectionItemButton
          aria-expanded={isFlyoutOpen}
          aria-haspopup="dialog"
          aria-label={i18n.ML_JOB_SETTINGS}
          color="primary"
          data-test-subj="integrations-button"
          onClick={() => {
            toggleFlyout();
            refreshJobs();
          }}
          textProps={{ style: { fontSize: '1rem' } }}
        >
          {i18n.ML_JOB_SETTINGS}
        </EuiHeaderSectionItemButton>
        {isFlyoutOpen && (
          <EuiFlyout
            size="m"
            onClose={closeFlyout}
            aria-labelledby={mlFlyoutTitleId}
            ownFocus
            data-test-subj="ml-job-settings-flyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
                <h2 id={mlFlyoutTitleId}>{i18n.ML_JOB_SETTINGS}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <div data-test-subj="ml-popover-contents">
                <PopoverDescription />

                <EuiSpacer />

                <EuiTabs size="s" bottomBorder data-test-subj="ml-jobs-tabs">
                  <EuiTab
                    isSelected={selectedTab === 'prebuilt'}
                    onClick={() => handleTabChange('prebuilt')}
                    data-test-subj="prebuilt-jobs-tab"
                  >
                    {filtersI18n.SHOW_PREBUILT_JOBS}
                  </EuiTab>
                  <EuiTab
                    isSelected={selectedTab === 'integration'}
                    onClick={() => handleTabChange('integration')}
                    data-test-subj="show-integration-jobs-tab"
                  >
                    {filtersI18n.SHOW_INTEGRATION_JOBS}
                  </EuiTab>
                </EuiTabs>

                <EuiSpacer />

                {selectedTab === 'integration' ? (
                  <IntegrationJobsPanel
                    jobs={integrationJobs}
                    fleetModules={fleetModules}
                    isLoading={isLoadingSecurityJobs || isLoadingEnableDataFeed}
                    mlNodesAvailable={mlNodesAvailable}
                    onMlNodesAvailable={setMlNodesAvailable}
                    onJobStateChange={handleJobStateChange}
                  />
                ) : (
                  <>
                    <JobsTableFilters securityJobs={jobs} onFilterChanged={setFilterProperties} />

                    <ShowingCount filterResultsLength={filteredJobs.length} />

                    <EuiSpacer size="m" />

                    <JobUpdatesCallout jobs={filteredJobs} />

                    {incompatibleJobCount > 0 && (
                      <>
                        <EuiCallOut
                          announceOnMount={false}
                          title={i18n.MODULE_NOT_COMPATIBLE_TITLE(incompatibleJobCount)}
                          color="warning"
                          iconType="warning"
                          size="s"
                        >
                          <p>
                            <FormattedMessage
                              defaultMessage="We could not find any data, see {mlDocs} for more information on Machine Learning job requirements."
                              id="xpack.securitySolution.components.mlPopup.moduleNotCompatibleDescription"
                              values={{
                                mlDocs: (
                                  <a
                                    href={`${docLinks.links.siem.ml}`}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                  >
                                    {i18n.ANOMALY_DETECTION_DOCS}
                                  </a>
                                ),
                              }}
                            />
                          </p>
                        </EuiCallOut>

                        <EuiSpacer size="m" />
                      </>
                    )}

                    <MLJobsAwaitingNodeWarning jobIds={installedJobsIds} />
                    <MlNodeAvailableWarningShared
                      size="s"
                      nodeAvailableCallback={setMlNodesAvailable}
                    />
                    <JobsTable
                      isLoading={isLoadingSecurityJobs || isLoadingEnableDataFeed}
                      jobs={filteredJobs}
                      onJobStateChange={handleJobStateChange}
                      mlNodesAvailable={mlNodesAvailable}
                    />
                  </>
                )}
              </div>
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </>
    );
  } else {
    // If the user has Platinum License & not ML Admin, hide Anomaly Detection button as they don't have permissions to configure
    return null;
  }
});

MlPopover.displayName = 'MlPopover';
