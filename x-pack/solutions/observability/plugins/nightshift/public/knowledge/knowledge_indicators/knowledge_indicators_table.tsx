/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useSourcesById } from '../../data/sources/use_sources_by_id';
import { getFeaturesFromKIs } from './utils/get_features_from_kis';
import { KnowledgeIndicatorsEmptyStateImage } from './empty_state_image';
import { LoadingPanel } from '../../components/ui/loading_panel';
import { DeleteTableItemsModal } from './components/delete_table_items_modal';
import { getKnowledgeIndicatorItemId } from './utils/get_knowledge_indicator_item_id';
import { getKnowledgeIndicatorSourceId } from './utils/get_knowledge_indicator_source_id';
import { useBlocksNewActivity } from '../../data/maintenance/use_significant_events_maintenance';
import { useKnowledgeIndicatorsTable } from './use_knowledge_indicators_table';
import { useKnowledgeIndicatorsColumns } from './use_knowledge_indicators_columns';
import { KnowledgeIndicatorsToolbar } from './knowledge_indicators_toolbar';
import {
  TABLE_CAPTION,
  NO_ITEMS_MESSAGE,
  EMPTY_STATE_TITLE,
  DELETE_MODAL_TITLE,
  HIDDEN_COMPUTED_FEATURES_HINT,
} from './translations';

const KnowledgeIndicatorDetailsFlyout = React.lazy(() =>
  import('./components/knowledge_indicator_details_flyout').then((module) => ({
    default: module.KnowledgeIndicatorDetailsFlyout,
  }))
);

export function KnowledgeIndicatorsTable(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana();
  const canManage = getNightshiftCapabilities(application.capabilities.nightshift).canManage;
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();

  const {
    knowledgeIndicators,
    occurrencesByQueryId,
    isLoading,
    isEmpty,
    filteredKnowledgeIndicators,
    selectedKnowledgeIndicator,
    selectedKnowledgeIndicatorId,
    selectedKnowledgeIndicators,
    setSelectedKnowledgeIndicators,
    knowledgeIndicatorsToDelete,
    setKnowledgeIndicatorsToDelete,
    pagination,
    isDeleting,
    isBulkOperationInProgress,
    isBulkPromoteInProgress,
    isOperationInProgress,
    selectionContainsNonExcludable,
    hasPromotableSelected,
    isSelectionActionsDisabled,
    hasOnlyHiddenComputedFeatures,
    tableSearchValue,
    debouncedSearchTerm,
    statusFilter,
    selectedTypes,
    selectedSubtypes,
    selectedStreams,
    hideComputedTypes,
    handleStatusFilterChange,
    handleSelectedTypesChange,
    handleSelectedSubtypesChange,
    handleSelectedStreamsChange,
    handleComputedToggleChange,
    handleSearchChange,
    handleTableChange,
    handleBulkExclude,
    handleBulkRestore,
    closeFlyout,
    toggleSelectedKnowledgeIndicator,
    selectKnowledgeIndicator,
    deleteKnowledgeIndicatorsInBulk,
    handleBulkPromote,
    goToPageForItemIndex,
  } = useKnowledgeIndicatorsTable();

  const features = useMemo(() => getFeaturesFromKIs(knowledgeIndicators), [knowledgeIndicators]);

  const { sourcesById } = useSourcesById();

  const currentIndex = filteredKnowledgeIndicators.findIndex(
    (ki) => getKnowledgeIndicatorItemId(ki) === selectedKnowledgeIndicatorId
  );

  const columns = useKnowledgeIndicatorsColumns({
    occurrencesByQueryId,
    selectedKnowledgeIndicatorId,
    toggleSelectedKnowledgeIndicator,
    setKnowledgeIndicatorsToDelete,
    canManage,
  });

  if (knowledgeIndicators.length === 0 && isLoading) {
    return <LoadingPanel size="l" />;
  }

  if (isEmpty) {
    return (
      <EuiEmptyPrompt
        aria-live="polite"
        color="plain"
        icon={<KnowledgeIndicatorsEmptyStateImage size={140} />}
        title={<h2>{EMPTY_STATE_TITLE}</h2>}
        body={
          <p>
            {i18n.translate('xpack.nightshift.knowledge.knowledgeIndicators.emptyStateBody', {
              defaultMessage: 'Knowledge indicators are generated from your sources.',
            })}
          </p>
        }
        actions={
          <EuiButton
            href={application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/sources' })}
            data-test-subj="knowledgeIndicatorsEmptyStateSourcesLink"
          >
            {i18n.translate('xpack.nightshift.knowledge.knowledgeIndicators.goToSourcesButton', {
              defaultMessage: 'Go to Sources',
            })}
          </EuiButton>
        }
      />
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiSpacer size="m" />
      <KnowledgeIndicatorsToolbar
        knowledgeIndicators={knowledgeIndicators}
        filteredCount={filteredKnowledgeIndicators.length}
        tableSearchValue={tableSearchValue}
        debouncedSearchTerm={debouncedSearchTerm}
        statusFilter={statusFilter}
        selectedTypes={selectedTypes}
        selectedSubtypes={selectedSubtypes}
        selectedStreams={selectedStreams}
        hideComputedTypes={hideComputedTypes}
        pagination={pagination}
        selectedKnowledgeIndicators={selectedKnowledgeIndicators}
        isBulkOperationInProgress={isBulkOperationInProgress}
        isBulkPromoteInProgress={isBulkPromoteInProgress}
        isDeleting={isDeleting}
        isSelectionActionsDisabled={isSelectionActionsDisabled}
        selectionContainsNonExcludable={selectionContainsNonExcludable}
        hasPromotableSelected={hasPromotableSelected}
        blocksActivity={blocksActivity}
        activityBlockTooltip={activityBlockTooltip}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={handleStatusFilterChange}
        onSelectedTypesChange={handleSelectedTypesChange}
        onSelectedSubtypesChange={handleSelectedSubtypesChange}
        onSelectedStreamsChange={handleSelectedStreamsChange}
        onComputedToggleChange={handleComputedToggleChange}
        onClearSelection={() => setSelectedKnowledgeIndicators([])}
        onBulkExclude={handleBulkExclude}
        onBulkRestore={handleBulkRestore}
        onBulkPromote={handleBulkPromote}
        onDeleteSelected={() => setKnowledgeIndicatorsToDelete(selectedKnowledgeIndicators)}
        canManage={canManage}
      />
      <EuiSpacer size="s" />
      <EuiHorizontalRule
        margin="none"
        css={css`
          height: ${euiTheme.border.width.thick};
        `}
      />
      {hasOnlyHiddenComputedFeatures && (
        <>
          <EuiSpacer size="s" />
          <KbnInfoCallout size="s" title={HIDDEN_COMPUTED_FEATURES_HINT} announceOnMount={false} />
        </>
      )}
      <EuiPanel
        color="transparent"
        hasShadow={false}
        hasBorder={false}
        paddingSize="none"
        css={css`
          overflow-x: auto;
          min-width: 0;
          ${isOperationInProgress
            ? `
                pointer-events: none;
                opacity: 0.6;
              `
            : ''}
        `}
      >
        <EuiInMemoryTable<KnowledgeIndicator>
          css={css`
            min-width: 1100px;
          `}
          items={filteredKnowledgeIndicators}
          itemId={getKnowledgeIndicatorItemId}
          columns={columns}
          loading={isOperationInProgress}
          rowProps={(ki: KnowledgeIndicator) => ({
            isSelected: selectedKnowledgeIndicatorId === getKnowledgeIndicatorItemId(ki),
          })}
          selection={
            canManage
              ? {
                  selected: selectedKnowledgeIndicators,
                  onSelectionChange: setSelectedKnowledgeIndicators,
                }
              : undefined
          }
          pagination={{
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            pageSizeOptions: [25, 50, 100],
          }}
          onTableChange={handleTableChange}
          tableCaption={TABLE_CAPTION}
          noItemsMessage={!isLoading ? NO_ITEMS_MESSAGE : ''}
        />
      </EuiPanel>
      {selectedKnowledgeIndicator ? (
        <React.Suspense fallback={null}>
          <KnowledgeIndicatorDetailsFlyout
            key={getKnowledgeIndicatorItemId(selectedKnowledgeIndicator)}
            knowledgeIndicator={selectedKnowledgeIndicator}
            occurrencesByQueryId={occurrencesByQueryId}
            onClose={closeFlyout}
            features={features}
            source={sourcesById.get(getKnowledgeIndicatorSourceId(selectedKnowledgeIndicator))}
            pageIndex={currentIndex}
            pageCount={filteredKnowledgeIndicators.length}
            onSelectPage={(nextIndex) => {
              const ki = filteredKnowledgeIndicators[nextIndex];
              if (!ki) {
                return;
              }
              goToPageForItemIndex(nextIndex);
              selectKnowledgeIndicator(ki);
            }}
          />
        </React.Suspense>
      ) : null}
      {knowledgeIndicatorsToDelete.length > 0 ? (
        <DeleteTableItemsModal
          title={DELETE_MODAL_TITLE(knowledgeIndicatorsToDelete.length)}
          items={knowledgeIndicatorsToDelete}
          onCancel={() => setKnowledgeIndicatorsToDelete([])}
          onConfirm={() => {
            void deleteKnowledgeIndicatorsInBulk(knowledgeIndicatorsToDelete);
          }}
          isLoading={isDeleting}
        />
      ) : null}
    </EuiPanel>
  );
}
