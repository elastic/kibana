/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiConfirmModal, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useHistory, useParams } from 'react-router-dom';
import { RETRY_BUTTON_LABEL } from '../common/messages';
import { useRunQuotas } from '../data/run_quotas/use_significant_events_run_quotas';
import { useKibana } from '../hooks/use_kibana';
import { useInvestigatorServiceAccount } from '../service_account/use_investigator_service_account';
import {
  MANAGE_SECURITY_REQUIRED_BODY,
  MANAGE_SECURITY_REQUIRED_REASON,
  MANAGE_SECURITY_REQUIRED_TITLE,
} from './utils/edit_permission';
import { CreateAutomationFlyout } from './flyouts/create_flyout/create_automation_flyout';
import { useAutomationFilters } from './hooks/use_automation_filters';
import { useAutomationUsage, type TimeRange } from './hooks/use_automation_usage';
import {
  AUTOMATIONS_LOAD_ERROR_TITLE,
  useCreateAutomation,
  useCurrentUsername,
  useDeleteAutomation,
  useRefreshAutomations,
  useFetchAutomations,
  type Automation,
} from './hooks/use_automations';
import { AutomationsEmptyPrompt, FilteredEmptyPrompt } from './list/automations_empty_prompt';
import { AutomationsTable } from './list/automations_table';
import { AutomationsToolbar } from './list/automations_toolbar';
import { GlobalLimitCallout } from './list/global_limit_callout';
import { RateLimitCallout } from './list/rate_limit_callout';
import { getDeleteConfirmTitle, listLabels } from './list/translations';
import { toCloneRequestBody } from './utils/clone_automation';
import { AutomationDetailFlyout } from './detail_flyout/automation_detail_flyout';
import {
  getAutomationFacets,
  isAutomationRateLimited,
  isGlobalInvestigationLimitReached,
  isOnlyRateLimitedFilter,
  statusLabels,
} from './utils/filter_automations';

const DEFAULT_PAGE_SIZE = 10;

export const AutomationsPage = (): React.ReactElement => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const { services } = useKibana();
  const hasManagePrivilege = getNightshiftCapabilities(
    services.application.capabilities.nightshift
  ).canManage;
  // Automations run as the space's automations service account, and writing a workflow bound to
  // a service account requires manage_security.
  // Until the status is known, nothing is offered for editing, so no action flickers in and out.
  const { data: serviceAccount } = useInvestigatorServiceAccount();
  const needsManageSecurity = serviceAccount?.serviceAccountsEnabled === true;
  const canManage =
    hasManagePrivilege &&
    serviceAccount !== undefined &&
    (!needsManageSecurity || serviceAccount.canModifyBoundWorkflows === true);
  // A Nightshift manager who is only missing manage_security sees the edit actions disabled, with
  // that reason, rather than not at all.
  const editDisabledReason =
    hasManagePrivilege && needsManageSecurity && !canManage
      ? MANAGE_SECURITY_REQUIRED_REASON
      : undefined;
  const { data, error, isInitialLoading, refetch } = useFetchAutomations();
  const deleteAutomation = useDeleteAutomation();
  const refreshAutomations = useRefreshAutomations();
  const cloneAutomation = useCreateAutomation(true);
  const currentUsername = useCurrentUsername();
  const [automationToDelete, setAutomationToDelete] = useState<Automation | undefined>();
  const [range, setRange] = useState<TimeRange>({ start: 'now-48h', end: 'now' });
  const [rangeLabel, setRangeLabel] = useState(listLabels.last48Hours);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const [order, setOrder] = useState<string[]>([]);
  const [page, setPage] = useState({ index: 0, size: DEFAULT_PAGE_SIZE });
  const automations = useMemo(() => data?.automations ?? [], [data?.automations]);
  const isCreating = id === 'new';
  const detailAutomation = isCreating
    ? undefined
    : automations.find((automation) => automation.id === id);
  const navigate = (path: string) => history.push(path);
  const { runRange, runCounts, usedToday } = useAutomationUsage(automations, range, refreshedAt);
  const isRateLimited = (automation: Automation) =>
    isAutomationRateLimited(automation, usedToday.get(automation.id) ?? 0);
  const getFacets = (automation: Automation) =>
    getAutomationFacets(automation, { isRateLimited: isRateLimited(automation), currentUsername });
  const {
    filters,
    setFilter,
    showOnlyStatus,
    clearFilterSelections,
    clearSearchAndFilters,
    hasFilterSelections,
    hasActiveFilters,
    visibleAutomations,
    options,
  } = useAutomationFilters(automations, getFacets);
  const { data: quotas, refetch: refetchQuotas } = useRunQuotas();
  const isGlobalLimitReached = isGlobalInvestigationLimitReached(quotas);
  const globalLimitSettingsHref = quotas?.canManage
    ? services.application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/settings/investigations' })
    : undefined;
  const rateLimitedCount = automations.filter(isRateLimited).length;
  const openCreateFlyout = canManage ? () => navigate('/automations/new') : undefined;
  const isEmpty = !isInitialLoading && !error && automations.length === 0;
  const lastPageIndex = Math.max(0, Math.ceil(visibleAutomations.length / page.size) - 1);
  const pageIndex = Math.min(page.index, lastPageIndex);
  const filtersKey = JSON.stringify(filters);

  useEffect(() => setPage((current) => ({ ...current, index: 0 })), [filtersKey]);
  useEffect(() => {
    const isUnknownAutomation = Boolean(id) && !isCreating && Boolean(data) && !detailAutomation;
    if (isUnknownAutomation || (isCreating && !canManage)) history.replace('/automations');
  }, [id, isCreating, canManage, data, detailAutomation, history]);

  const orderedAutomations = order.flatMap((orderedId) =>
    visibleAutomations.filter((automation) => automation.id === orderedId)
  );
  const cloneNames = automations.map(({ name }) => name);

  const renderContent = () => {
    if (isInitialLoading) return <EuiLoadingSpinner size="l" />;
    if (error && !data) {
      return (
        <KbnDangerCallout
          announceOnMount
          title={AUTOMATIONS_LOAD_ERROR_TITLE}
          actionProps={{
            primary: {
              children: RETRY_BUTTON_LABEL,
              iconType: 'refresh',
              onClick: () => refetch(),
              'data-test-subj': 'nightshiftAutomationsPageButton',
            },
          }}
        />
      );
    }
    if (visibleAutomations.length === 0) {
      return hasActiveFilters ? (
        <FilteredEmptyPrompt onClearFilters={clearSearchAndFilters} />
      ) : (
        <AutomationsEmptyPrompt
          onCreate={openCreateFlyout}
          createDisabledReason={editDisabledReason}
        />
      );
    }
    return (
      <AutomationsTable
        automations={visibleAutomations}
        canManage={canManage}
        editDisabledReason={editDisabledReason}
        runCounts={runCounts}
        usedToday={usedToday}
        getFacets={getFacets}
        isRateLimited={isRateLimited}
        pageIndex={pageIndex}
        pageSize={page.size}
        onPageChange={(index, size) => setPage({ index, size })}
        onClone={(automation) => cloneAutomation.mutate(toCloneRequestBody(automation, cloneNames))}
        onDelete={setAutomationToDelete}
        onOpenAutomation={(automation) => navigate(`/automations/${automation.id}`)}
        onOpenRuns={(automation, status) =>
          navigate(`/automations/${automation.id}/runs?status=${status}`)
        }
        selectedId={id}
        onOrderChange={setOrder}
      />
    );
  };

  return (
    <>
      {editDisabledReason && (
        <>
          <KbnInfoCallout
            size="s"
            title={MANAGE_SECURITY_REQUIRED_TITLE}
            data-test-subj="nightshiftAutomationsServiceAccountReadOnly"
          >
            {MANAGE_SECURITY_REQUIRED_BODY}
          </KbnInfoCallout>
          <EuiSpacer size="m" />
        </>
      )}
      {!isEmpty && (
        <>
          {isGlobalLimitReached && quotas && (
            <>
              <GlobalLimitCallout
                limit={quotas.limits.investigation}
                settingsHref={globalLimitSettingsHref}
              />
              <EuiSpacer size="m" />
            </>
          )}
          {!isGlobalLimitReached && rateLimitedCount > 0 && (
            <>
              <RateLimitCallout
                count={rateLimitedCount}
                onShow={
                  isOnlyRateLimitedFilter(filters)
                    ? undefined
                    : () => showOnlyStatus(statusLabels.rateLimited)
                }
              />
              <EuiSpacer size="m" />
            </>
          )}
          <AutomationsToolbar
            filters={filters}
            options={options}
            hasFilterSelections={hasFilterSelections}
            hasActiveFilters={hasActiveFilters}
            visibleCount={visibleAutomations.length}
            totalCount={automations.length}
            pageIndex={pageIndex}
            pageSize={page.size}
            onFilterChange={setFilter}
            onClearFilters={clearFilterSelections}
            onRangeChange={(nextRange, label) => {
              setRange(nextRange);
              setRangeLabel(label);
              setRefreshedAt(Date.now());
            }}
            onRefresh={() => {
              setRefreshedAt(Date.now());
              refreshAutomations();
              refetchQuotas();
            }}
            onCreate={openCreateFlyout}
            createDisabledReason={editDisabledReason}
          />
        </>
      )}
      {renderContent()}
      {isCreating && canManage && (
        <CreateAutomationFlyout
          tagSuggestions={options.tags.map(({ label }) => label)}
          onClose={() => navigate('/automations')}
          onCreated={(createdId) => history.replace(`/automations/${createdId}`)}
        />
      )}
      {detailAutomation && (
        <AutomationDetailFlyout
          key={detailAutomation.id}
          automations={orderedAutomations}
          automation={detailAutomation}
          canManage={canManage}
          editDisabledReason={editDisabledReason}
          usedToday={usedToday.get(detailAutomation.id) ?? 0}
          runRange={runRange}
          rangeLabel={rangeLabel}
          onClose={() => navigate('/automations')}
          onClone={(automation) =>
            cloneAutomation.mutate(toCloneRequestBody(automation, cloneNames), {
              onSuccess: ({ id: copyId }) => navigate(`/automations/${copyId}`),
            })
          }
          onDelete={setAutomationToDelete}
        />
      )}
      {automationToDelete && (
        <EuiConfirmModal
          title={getDeleteConfirmTitle(automationToDelete.name)}
          onCancel={() => setAutomationToDelete(undefined)}
          onConfirm={() => {
            deleteAutomation.mutate(
              { id: automationToDelete.id, name: automationToDelete.name },
              { onSuccess: () => setAutomationToDelete(undefined) }
            );
          }}
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
