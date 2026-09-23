/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { MLJobsAwaitingNodeWarning, MlNodeAvailableWarningShared } from '@kbn/ml-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../lib/kibana';
import { filterJobs } from './helpers';
import { useEnableDataFeed } from './hooks/use_enable_data_feed';
import { useSecurityJobs } from './hooks/use_security_jobs';
import { JobsTableFilters } from './jobs_table/filters/jobs_table_filters';
import { JobsTable } from './jobs_table/jobs_table';
import { ShowingCount } from './jobs_table/showing_count';
import { PopoverDescription } from './popover_description';
import * as i18n from './translations';
import type { JobsFilters, SecurityJob } from './types';
import { UpgradeContents } from './upgrade_contents';

/** Matches the legacy popover content width as a comfortable default. */
const DEFAULT_FLYOUT_WIDTH = 720;
const MIN_FLYOUT_WIDTH = 480;
const MAX_FLYOUT_WIDTH = 1200;

const defaultFilterProps: JobsFilters = {
  filterQuery: '',
  showCustomJobs: false,
  showElasticJobs: false,
  selectedGroups: [],
};

interface MlJobSettingsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Same ML job settings content as {@link MlPopover}, presented in a resizable flyout for Chrome Next headers.
 */
export const MlJobSettingsFlyout = React.memo<MlJobSettingsFlyoutProps>(({ isOpen, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'mlJobSettingsFlyout' });
  const { euiTheme } = useEuiTheme();
  const [filterProperties, setFilterProperties] = useState(defaultFilterProps);
  const [mlNodesAvailable, setMlNodesAvailable] = useState(false);

  const {
    isMlAdmin,
    isLicensed,
    loading: isLoadingSecurityJobs,
    jobs,
    refetch: refreshJobs,
  } = useSecurityJobs();

  const docLinks = useKibana().services.docLinks;
  const {
    enableDatafeed,
    disableDatafeed,
    isLoading: isLoadingEnableDataFeed,
  } = useEnableDataFeed();

  useEffect(() => {
    if (isOpen && isLicensed && isMlAdmin) {
      refreshJobs();
    }
  }, [isOpen, isLicensed, isMlAdmin, refreshJobs]);

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

  const filteredJobs = filterJobs({
    jobs,
    ...filterProperties,
  });

  const incompatibleJobCount = jobs.filter((j) => !j.isCompatible).length;
  const installedJobsIds = useMemo(
    () => jobs.filter((j) => j.isInstalled).map((j) => j.id),
    [jobs]
  );

  const flyoutBodyStyles = css`
    min-width: 0;

    /* Let filters / table reflow as the flyout is resized */
    .euiFlexGroup {
      flex-wrap: wrap;
    }

    [data-test-subj='jobs-table'] {
      min-width: 0;
      overflow-x: auto;
    }
  `;

  if (!isOpen) {
    return null;
  }

  // Platinum without ML admin — nothing to configure (same as MlPopover).
  if (isLicensed && !isMlAdmin) {
    return null;
  }

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      size={DEFAULT_FLYOUT_WIDTH}
      minWidth={MIN_FLYOUT_WIDTH}
      maxWidth={Math.min(MAX_FLYOUT_WIDTH, euiTheme.breakpoint.xl)}
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="ml-job-settings-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{i18n.ML_JOB_SETTINGS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!isLicensed ? (
          <UpgradeContents />
        ) : (
          <div css={flyoutBodyStyles} data-test-subj="ml-job-settings-flyout-contents">
            <PopoverDescription />
            <EuiSpacer />
            <JobsTableFilters securityJobs={jobs} onFilterChanged={setFilterProperties} />
            <ShowingCount filterResultsLength={filteredJobs.length} />
            <EuiSpacer size="m" />
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
            <MlNodeAvailableWarningShared size="s" nodeAvailableCallback={setMlNodesAvailable} />
            <JobsTable
              isLoading={isLoadingSecurityJobs || isLoadingEnableDataFeed}
              jobs={filteredJobs}
              onJobStateChange={handleJobStateChange}
              mlNodesAvailable={mlNodesAvailable}
              responsiveBreakpoint="m"
            />
          </div>
        )}
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
});

MlJobSettingsFlyout.displayName = 'MlJobSettingsFlyout';
