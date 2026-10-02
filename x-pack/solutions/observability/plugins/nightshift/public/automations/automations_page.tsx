/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiButton, EuiCallOut, EuiConfirmModal, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { RETRY_BUTTON_LABEL } from '../common/messages';
import { useKibana } from '../hooks/use_kibana';
import { CreateAutomationFlyout } from './flyouts/create_flyout/create_automation_flyout';
import { useAutomationFilters } from './hooks/use_automation_filters';
import { useAutomationUsage, type TimeRange } from './hooks/use_automation_usage';
import {
  AUTOMATIONS_LOAD_ERROR_TITLE,
  useCreateAutomation,
  useCurrentUsername,
  useDeleteAutomation,
  useFetchAutomations,
  type Automation,
} from './hooks/use_automations';
import { AutomationsEmptyPrompt, FilteredEmptyPrompt } from './list/automations_empty_prompt';
import { AutomationsTable } from './list/automations_table';
import { AutomationsToolbar } from './list/automations_toolbar';
import { RateLimitCallout } from './list/rate_limit_callout';
import { getDeleteConfirmTitle, listLabels } from './list/translations';
import { toCloneRequestBody } from './utils/clone_automation';
import {
  getAutomationFacets,
  isAutomationRateLimited,
  statusLabels,
} from './utils/filter_automations';

export const AutomationsPage = (): React.ReactElement => {
  const { services } = useKibana();
  const canManage = getNightshiftCapabilities(
    services.application.capabilities.nightshift
  ).canManage;
  const { data, error, isInitialLoading, refetch } = useFetchAutomations();
  const deleteAutomation = useDeleteAutomation();
  const createAutomation = useCreateAutomation();
  const currentUsername = useCurrentUsername();
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<Automation | undefined>();
  const [range, setRange] = useState<TimeRange>({ start: 'now-48h', end: 'now' });
  const automations = useMemo(() => data?.automations ?? [], [data?.automations]);
  const { runRange, runTotals, usedToday } = useAutomationUsage(automations, range);
  const isRateLimited = (automation: Automation) =>
    isAutomationRateLimited(automation, usedToday.get(automation.id) ?? 0);
  const getFacets = (automation: Automation) =>
    getAutomationFacets(automation, { isRateLimited: isRateLimited(automation), currentUsername });
  const { filters, setFilter, clearFilters, hasFilters, visibleAutomations, options } =
    useAutomationFilters(automations, getFacets);
  const rateLimitedCount = automations.filter(isRateLimited).length;
  const openCreateFlyout = canManage ? () => setIsCreateFlyoutOpen(true) : undefined;
  const isEmpty = !isInitialLoading && !error && automations.length === 0;

  const renderContent = () => {
    if (isInitialLoading) return <EuiLoadingSpinner size="l" />;
    if (error && !data) {
      return (
        <EuiCallOut announceOnMount color="danger" iconType="warning">
          <p>{AUTOMATIONS_LOAD_ERROR_TITLE}</p>
          <EuiButton
            data-test-subj="nightshiftAutomationsPageButton"
            color="danger"
            onClick={() => refetch()}
            iconType="refresh"
            size="s"
          >
            {RETRY_BUTTON_LABEL}
          </EuiButton>
        </EuiCallOut>
      );
    }
    if (visibleAutomations.length === 0) {
      return hasFilters ? (
        <FilteredEmptyPrompt onClearFilters={clearFilters} />
      ) : (
        <AutomationsEmptyPrompt onCreate={openCreateFlyout} />
      );
    }
    return (
      <AutomationsTable
        automations={visibleAutomations}
        canManage={canManage}
        runRange={runRange}
        runTotals={runTotals}
        usedToday={usedToday}
        getFacets={getFacets}
        isRateLimited={isRateLimited}
        onClone={(automation) => createAutomation.mutate(toCloneRequestBody(automation))}
        onDelete={setAutomationToDelete}
      />
    );
  };

  return (
    <>
      {!isEmpty && (
        <>
          {rateLimitedCount > 0 && (
            <>
              <RateLimitCallout
                count={rateLimitedCount}
                onShow={() => setFilter('statuses', [statusLabels.rateLimited])}
              />
              <EuiSpacer size="m" />
            </>
          )}
          <AutomationsToolbar
            filters={filters}
            options={options}
            hasFilters={hasFilters}
            visibleCount={visibleAutomations.length}
            totalCount={automations.length}
            range={range}
            onFilterChange={setFilter}
            onClearFilters={clearFilters}
            onRangeChange={setRange}
            onCreate={openCreateFlyout}
          />
        </>
      )}
      {renderContent()}
      {isCreateFlyoutOpen && (
        <CreateAutomationFlyout
          tagSuggestions={options.tags.map(({ label }) => label)}
          onClose={() => setIsCreateFlyoutOpen(false)}
        />
      )}
      {automationToDelete && (
        <EuiConfirmModal
          title={getDeleteConfirmTitle(automationToDelete.name)}
          onCancel={() => setAutomationToDelete(undefined)}
          onConfirm={() =>
            deleteAutomation.mutate(automationToDelete.id, {
              onSuccess: () => setAutomationToDelete(undefined),
            })
          }
          cancelButtonText={listLabels.cancel}
          confirmButtonText={listLabels.delete}
          buttonColor="danger"
          isLoading={deleteAutomation.isLoading}
          aria-label={getDeleteConfirmTitle(automationToDelete.name)}
        >
          <p>{listLabels.deleteBody}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};
