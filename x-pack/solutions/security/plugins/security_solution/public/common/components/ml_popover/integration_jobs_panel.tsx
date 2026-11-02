/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCard,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { MLJobsAwaitingNodeWarning, MlNodeAvailableWarningShared } from '@kbn/ml-plugin/public';
import { useAddIntegrationsUrl } from '../../hooks/use_add_integrations_url';
import { searchFilter } from './helpers';
import { JobUpdatesCallout } from './job_updates_callout';
import type { Module, SecurityJob } from './types';
import { JobsTable } from './jobs_table/jobs_table';
import { ShowingCount } from './jobs_table/showing_count';
import * as filtersI18n from './jobs_table/filters/translations';
import * as i18n from './jobs_table/translations';

interface IntegrationPackageCard {
  module: Module;
  jobs: SecurityJob[];
  installedCount: number;
  updateCount: number;
}

interface IntegrationJobsPanelProps {
  jobs: SecurityJob[];
  fleetModules: Module[];
  isLoading: boolean;
  mlNodesAvailable: boolean;
  onMlNodesAvailable: (available: boolean) => void;
  onJobStateChange: (job: SecurityJob, latestTimestampMs: number, enable: boolean) => Promise<void>;
}

const IntegrationJobsEmptyPrompt = React.memo(() => {
  const { onClick } = useAddIntegrationsUrl();

  return (
    <EuiEmptyPrompt
      data-test-subj="ml-integration-jobs-empty"
      title={<h3>{i18n.NO_INTEGRATION_JOBS_TEXT}</h3>}
      titleSize="xs"
      actions={
        <EuiButton
          onClick={onClick}
          iconType="plusInCircle"
          size="s"
          data-test-subj="browse-integrations-for-ml-jobs"
        >
          {i18n.BROWSE_INTEGRATIONS}
        </EuiButton>
      }
    />
  );
});

IntegrationJobsEmptyPrompt.displayName = 'IntegrationJobsEmptyPrompt';

const truncateDescription = (description: string, max = 120) =>
  description.length > max ? `${description.substring(0, max)}...` : description;

export const IntegrationJobsPanel = React.memo(
  ({
    jobs,
    fleetModules = [],
    isLoading,
    mlNodesAvailable,
    onMlNodesAvailable,
    onJobStateChange,
  }: IntegrationJobsPanelProps) => {
    const [filterQuery, setFilterQuery] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

    const handleChange = useCallback<NonNullable<EuiSearchBarProps['onChange']>>((query) => {
      setFilterQuery(query.queryText.trim());
    }, []);

    const clearSelectedModule = useCallback(() => {
      setSelectedModuleId(null);
      setFilterQuery('');
    }, []);

    const packages = useMemo((): IntegrationPackageCard[] => {
      const jobsByModule = jobs.reduce<Record<string, SecurityJob[]>>((acc, job) => {
        const moduleJobs = acc[job.moduleId] ?? [];
        moduleJobs.push(job);
        acc[job.moduleId] = moduleJobs;
        return acc;
      }, {});

      return fleetModules
        .map((module) => {
          const moduleJobs = jobsByModule[module.id] ?? [];
          return {
            module,
            jobs: moduleJobs,
            installedCount: moduleJobs.filter((job) => job.isInstalled).length,
            updateCount: moduleJobs.filter((job) => job.isUpdateAvailable).length,
          };
        })
        .sort((a, b) => (a.module.title ?? '').localeCompare(b.module.title ?? ''));
    }, [fleetModules, jobs]);

    const filteredPackages = useMemo(() => {
      if (!filterQuery) {
        return packages;
      }
      const query = filterQuery.toLowerCase();
      return packages.filter(
        ({ module }) =>
          (module.title ?? '').toLowerCase().includes(query) ||
          (module.description ?? '').toLowerCase().includes(query) ||
          (module.id ?? '').toLowerCase().includes(query)
      );
    }, [filterQuery, packages]);

    const selectedPackage = useMemo(
      () => packages.find((pkg) => pkg.module.id === selectedModuleId) ?? null,
      [packages, selectedModuleId]
    );

    const selectedJobs = selectedPackage?.jobs ?? [];
    const filteredSelectedJobs = useMemo(
      () => searchFilter(selectedJobs, filterQuery),
      [filterQuery, selectedJobs]
    );

    const installedJobsIds = useMemo(
      () => jobs.filter((job) => job.isInstalled).map((job) => job.id),
      [jobs]
    );

    if (packages.length === 0 && !isLoading) {
      return (
        <div data-test-subj="ml-integration-jobs-panel">
          <MlNodeAvailableWarningShared size="s" nodeAvailableCallback={onMlNodesAvailable} />
          <IntegrationJobsEmptyPrompt />
        </div>
      );
    }

    if (selectedPackage) {
      return (
        <div data-test-subj="ml-integration-jobs-panel">
          <EuiButtonEmpty
            flush="left"
            iconType="arrowLeft"
            size="s"
            onClick={clearSelectedModule}
            data-test-subj="integration-jobs-back-to-packages"
          >
            {i18n.BACK_TO_INTEGRATION_PACKAGES}
          </EuiButtonEmpty>

          <EuiSpacer size="s" />

          <EuiTitle size="xs">
            <h3 data-test-subj="integration-package-jobs-title">{selectedPackage.module.title}</h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>{selectedPackage.module.description}</p>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiSearchBar
            data-test-subj="integration-jobs-filter-bar"
            box={{
              placeholder: filtersI18n.FILTER_PLACEHOLDER,
              incremental: true,
              fullWidth: true,
            }}
            onChange={handleChange}
          />

          <ShowingCount filterResultsLength={filteredSelectedJobs.length} />

          <EuiSpacer size="m" />

          <JobUpdatesCallout jobs={filteredSelectedJobs} />

          <MLJobsAwaitingNodeWarning jobIds={installedJobsIds} />
          <MlNodeAvailableWarningShared size="s" nodeAvailableCallback={onMlNodesAvailable} />

          <JobsTable
            isLoading={isLoading}
            jobs={filteredSelectedJobs}
            onJobStateChange={onJobStateChange}
            mlNodesAvailable={mlNodesAvailable}
            noItemsMessage={<IntegrationJobsEmptyPrompt />}
          />
        </div>
      );
    }

    return (
      <div data-test-subj="ml-integration-jobs-panel">
        <EuiSearchBar
          data-test-subj="integration-packages-filter-bar"
          box={{
            placeholder: i18n.SEARCH_INTEGRATION_PACKAGES_PLACEHOLDER,
            incremental: true,
            fullWidth: true,
          }}
          onChange={handleChange}
        />

        <EuiSpacer size="m" />

        <MlNodeAvailableWarningShared size="s" nodeAvailableCallback={onMlNodesAvailable} />

        {filteredPackages.length === 0 ? (
          <EuiEmptyPrompt
            title={<h3>{i18n.NO_MATCHING_INTEGRATION_PACKAGES}</h3>}
            titleSize="xs"
          />
        ) : (
          <EuiFlexGrid gutterSize="m" columns={1} data-test-subj="integration-packages-grid">
            {filteredPackages.map(({ module, jobs: moduleJobs, installedCount, updateCount }) => (
              <EuiFlexItem key={module.id}>
                <EuiCard
                  data-test-subj={`integration-package-card-${module.id}`}
                  layout="horizontal"
                  titleSize="xs"
                  icon={
                    module.logo?.icon ? (
                      <EuiIcon aria-hidden={true} size="xl" type={module.logo.icon} />
                    ) : (
                      <EuiIcon aria-hidden={true} size="xl" type="machineLearningApp" />
                    )
                  }
                  title={module.title}
                  description={
                    <>
                      {truncateDescription(module.description ?? '')}
                      <EuiSpacer size="s" />
                      <EuiBadge color="hollow">
                        {i18n.INTEGRATION_PACKAGE_JOB_COUNT(moduleJobs.length)}
                      </EuiBadge>{' '}
                      <EuiBadge color="hollow">
                        {i18n.INTEGRATION_PACKAGE_INSTALLED_COUNT(installedCount)}
                      </EuiBadge>
                      {updateCount > 0 && (
                        <>
                          {' '}
                          <EuiBadge color="primary" data-test-subj="integration-package-update-badge">
                            {i18n.INTEGRATION_PACKAGE_UPDATES_COUNT(updateCount)}
                          </EuiBadge>
                        </>
                      )}
                    </>
                  }
                  onClick={() => {
                    setFilterQuery('');
                    setSelectedModuleId(module.id);
                  }}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        )}
      </div>
    );
  }
);

IntegrationJobsPanel.displayName = 'IntegrationJobsPanel';
