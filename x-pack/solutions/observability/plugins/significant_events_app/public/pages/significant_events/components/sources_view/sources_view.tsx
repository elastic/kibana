/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { KIS_ONBOARDING_IN_PROGRESS_STATUSES } from '@kbn/significant-events-schema';
import React, { useCallback, useState } from 'react';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSourcesApi } from '../../../../hooks/use_sources_api';
import { useSignificantEventsPageContext } from '../../context/significant_events_page_context';
import type { SignificantEventsSearchBarProps } from '../../../../components/search_bar';
import { SignificantEventsSearchBar } from '../../../../components/search_bar';
import { useBlocksNewActivity } from '../../../../hooks/use_significant_events_maintenance';
import { useKiGeneration } from '../knowledge_indicators_table/ki_generation_context';
import { FindSignificantEventsButton } from '../shared/find_significant_events_button';
import { GenerateSplitButton } from '../shared/generate_split_button';
import { getGenerateDisabledTooltip } from '../shared/translations';
import { ConfirmSourceActionModal, type SourceAction } from './confirm_source_action_modal';
import { SourceFlyout } from './source_flyout/source_flyout';
import { SourcesTable } from './sources_table';
import {
  CREATE_SOURCE_BUTTON_LABEL,
  EMPTY_STATE_BODY,
  EMPTY_STATE_TITLE,
  READ_ONLY_EMPTY_STATE_TITLE,
  RETRY_LABEL,
  SOURCES_LOAD_ERROR_BODY,
  SOURCES_LOAD_ERROR_TITLE,
  getSourcesCountLabel,
  SOURCES_TABLE_SEARCH_PLACEHOLDER,
} from './translations';

export function SourcesView() {
  const {
    core: {
      application: {
        capabilities: { nightshift },
      },
    },
  } = useKibana();
  const { canManage } = getNightshiftCapabilities(nightshift);
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const [searchText, setSearchText] = useState('');

  const {
    sources,
    isSourcesLoading,
    isSourcesError,
    refetchSources,
    isScheduling,
    onboardingConfig,
    setOnboardingConfig,
    featuresConnectors,
    queriesConnectors,
    generatingStreamNames,
    streamStatusMap,
    cancelOnboarding,
    bulkScheduleOnboarding,
    bulkOnboardAll,
    bulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly,
  } = useKiGeneration();
  const { setSourceEnabled, deleteSource } = useSourcesApi();

  const aiFeatures = useAIFeatures();
  const allConnectors = aiFeatures?.genAiConnectors?.connectors ?? [];
  const connectorError = aiFeatures?.genAiConnectors?.error;
  const isConnectorCatalogUnavailable =
    !allConnectors.length || !!aiFeatures?.genAiConnectors?.loading || !!connectorError;

  const { isRunning, isCanceling, handleRun, handleCancel } = useSignificantEventsPageContext();

  // Absent: closed. `{}`: creating. `{ source }`: editing that source.
  const [flyout, setFlyout] = useState<{ source?: NightshiftSource }>();
  const [pendingAction, setPendingAction] = useState<{
    action: SourceAction;
    source: NightshiftSource;
  }>();

  const isSourceActionable = useCallback(
    (source: NightshiftSource) => {
      // The onboarding route rejects disabled sources.
      if (!source.enabled || generatingStreamNames.includes(source.id)) {
        return false;
      }
      const result = streamStatusMap[source.id];
      return !!result && !KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(result.status);
    },
    [generatingStreamNames, streamStatusMap]
  );

  // Ids, not objects: the selection then follows refetches, and a deleted source drops out.
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const selectedSources = sources.filter(({ id }) => selectedSourceIds.includes(id));

  const onboardSelectedSources =
    (onboard: (sourceIds: string[]) => Promise<unknown>) => async () => {
      const sourceIds = selectedSources.filter(isSourceActionable).map(({ id }) => id);
      setSelectedSourceIds([]);
      await onboard(sourceIds);
    };

  const onConfirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }
    deleteSource.mutate(pendingAction.source, { onSettled: () => setPendingAction(undefined) });
  };

  const handleQueryChange: SignificantEventsSearchBarProps['onQueryChange'] = (queryPayload) => {
    setSearchText(String(queryPayload.query?.query ?? ''));
  };

  const openCreateFlyout = () => setFlyout({});
  // With cached sources, a failed refetch keeps the table; the toast already reports it.
  const hasSourcesLoadFailed = isSourcesError && sources.length === 0;
  const hasNoSources = !isSourcesLoading && !isSourcesError && sources.length === 0;

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="significantEventsAppSources">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
            <EuiFlexItem grow style={{ minWidth: 200 }}>
              <SignificantEventsSearchBar
                onQuerySubmit={handleQueryChange}
                onQueryChange={handleQueryChange}
                placeholder={SOURCES_TABLE_SEARCH_PLACEHOLDER}
                query={{
                  query: searchText,
                  language: 'text',
                }}
                showDatePicker
                showQueryInput
                enableDateRangePicker
                submitButtonStyle="iconOnly"
                isClearable
              />
            </EuiFlexItem>
            {canManage && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="significantEventsAppCreateSourceButton"
                  size="s"
                  iconType="plus"
                  onClick={openCreateFlyout}
                >
                  {CREATE_SOURCE_BUTTON_LABEL}
                </EuiButton>
              </EuiFlexItem>
            )}
            {canManage && (
              <EuiFlexItem grow={false}>
                <GenerateSplitButton
                  size="s"
                  config={onboardingConfig}
                  allConnectors={allConnectors}
                  connectorError={connectorError}
                  featuresResolvedConnectorId={featuresConnectors.resolvedConnectorId}
                  queriesResolvedConnectorId={queriesConnectors.resolvedConnectorId}
                  onConfigChange={setOnboardingConfig}
                  onRun={onboardSelectedSources(bulkOnboardAll)}
                  onRunFeaturesOnly={onboardSelectedSources(bulkOnboardFeaturesOnly)}
                  onRunQueriesOnly={onboardSelectedSources(bulkOnboardQueriesOnly)}
                  isRunDisabled={
                    blocksActivity ||
                    selectedSources.length === 0 ||
                    isConnectorCatalogUnavailable ||
                    featuresConnectors.loading ||
                    queriesConnectors.loading ||
                    isScheduling
                  }
                  runDisabledTooltip={getGenerateDisabledTooltip({
                    activityBlockTooltip,
                    hasSelectedStreams: selectedSources.length > 0,
                  })}
                  isConfigDisabled={selectedSources.length === 0}
                  isLoading={isScheduling}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <FindSignificantEventsButton
                onRun={handleRun}
                onCancel={handleCancel}
                isRunning={isRunning}
                isCanceling={isCanceling}
                isDisabled={isRunning || blocksActivity}
                disabledTooltip={activityBlockTooltip}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {hasSourcesLoadFailed ? (
          <EuiFlexItem>
            <EuiEmptyPrompt
              data-test-subj="significantEventsAppSourcesLoadErrorPrompt"
              color="danger"
              iconType="error"
              title={<h2>{SOURCES_LOAD_ERROR_TITLE}</h2>}
              body={<p>{SOURCES_LOAD_ERROR_BODY}</p>}
              actions={
                <EuiButton
                  data-test-subj="significantEventsAppSourcesLoadErrorRetryButton"
                  onClick={() => refetchSources()}
                >
                  {RETRY_LABEL}
                </EuiButton>
              }
            />
          </EuiFlexItem>
        ) : hasNoSources ? (
          <EuiFlexItem>
            <EuiEmptyPrompt
              data-test-subj="significantEventsAppSourcesEmptyPrompt"
              iconType="database"
              title={<h2>{canManage ? EMPTY_STATE_TITLE : READ_ONLY_EMPTY_STATE_TITLE}</h2>}
              body={<p>{EMPTY_STATE_BODY}</p>}
              actions={
                canManage && (
                  <EuiButton
                    data-test-subj="significantEventsAppSourcesEmptyPromptCreateButton"
                    fill
                    iconType="plus"
                    onClick={openCreateFlyout}
                  >
                    {CREATE_SOURCE_BUTTON_LABEL}
                  </EuiButton>
                )
              }
            />
          </EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{getSourcesCountLabel(sources.length)}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <SourcesTable
                sources={sources}
                onboardingResultMap={streamStatusMap}
                loading={isSourcesLoading}
                searchText={searchText}
                blocksActivity={blocksActivity}
                activityBlockTooltip={activityBlockTooltip}
                canManage={canManage}
                selection={
                  canManage
                    ? {
                        selected: selectedSources,
                        onSelectionChange: (selected) =>
                          setSelectedSourceIds(selected.map(({ id }) => id)),
                        selectable: isSourceActionable,
                      }
                    : undefined
                }
                pendingEnabledSourceId={
                  setSourceEnabled.isLoading ? setSourceEnabled.variables?.sourceId : undefined
                }
                onOpenSource={(source) => setFlyout({ source })}
                onToggleSourceEnabled={(source, enabled) =>
                  setSourceEnabled.mutate({ sourceId: source.id, enabled })
                }
                onOnboardSource={(sourceId) => bulkScheduleOnboarding([sourceId])}
                onStopOnboarding={cancelOnboarding}
                onDeleteSource={(source) => setPendingAction({ action: 'delete', source })}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>

      {flyout && (
        <SourceFlyout
          source={flyout.source}
          readOnly={!canManage}
          onClose={() => setFlyout(undefined)}
        />
      )}
      {pendingAction && (
        <ConfirmSourceActionModal
          action={pendingAction.action}
          source={pendingAction.source}
          isLoading={deleteSource.isLoading}
          onCancel={() => setPendingAction(undefined)}
          onConfirm={onConfirmPendingAction}
        />
      )}
    </>
  );
}
