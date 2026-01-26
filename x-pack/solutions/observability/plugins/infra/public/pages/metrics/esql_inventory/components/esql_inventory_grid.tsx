/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useEsqlQuery } from '../hooks/use_esql_query';
import { useValueFormatter } from '../hooks/use_value_formatter';

import { InventoryProvider, useInventoryContext } from './inventory_context';
import { InventoryHeader, ErrorCallout, EmptyQueryState, ChartContainer } from './common';
import { LegendModal } from './legend';
import { WaffleMap } from './waffle/waffle_map';
import { EsqlEditorSection } from './esql_editor_section';
import { InventoryToolbar } from './inventory_toolbar';
import { SaveQueryModal } from './save_query_modal';

// ============================================================================
// Main Component (with Provider)
// ============================================================================

export const EsqlInventoryGrid: React.FC = () => (
  <InventoryProvider>
    <InventoryGridContent />
  </InventoryProvider>
);

// ============================================================================
// Content Component (consumes context)
// ============================================================================

const InventoryGridContent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { data },
  } = useKibanaContextForPlugin();

  const {
    inventory,
    currentQuery,
    isLegendModalOpen,
    isSaveQueryModalOpen,
    editingMetricId,
    fieldsError,
    closeSaveQueryModal,
    saveCustomMetric,
    updateCustomMetric,
    getCustomMetricById,
    setRefetchCallback,
    handleFilter,
  } = useInventoryContext();

  // Value formatting
  const { formatter: valueFormatter, format: metricFormat } = useValueFormatter({
    selectedMetric: inventory.selectedMetric,
  });

  // Query execution - no auto-execution, handlers call refetch directly
  const {
    result: waffleResult,
    isLoading: waffleLoading,
    error: waffleError,
    refetch,
  } = useEsqlQuery({
    query: currentQuery.esql,
    timeRange: inventory.timeRange,
    search: data.search.search,
    enabled: currentQuery.esql.length > 20,
    formatter: valueFormatter,
    format: metricFormat,
    groupByFields: inventory.groupByFields,
  });

  // Register refetch callback with context so handlers can call it
  React.useEffect(() => {
    setRefetchCallback(refetch);
  }, [refetch, setRefetchCallback]);

  const showChart = currentQuery.esql.length > 20;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      css={css`
        padding: ${euiTheme.size.l};
        height: 100%;
      `}
    >
      {/* Header */}
      <EuiFlexItem grow={false}>
        <InventoryHeader />
      </EuiFlexItem>

      {/* Fields Error */}
      {fieldsError && (
        <EuiFlexItem grow={false}>
          <ErrorCallout
            title={i18n.translate('xpack.infra.esqlInventory.fieldsError.title', {
              defaultMessage: 'Error loading fields',
            })}
            message={fieldsError.message}
            color="warning"
            size="s"
          />
        </EuiFlexItem>
      )}

      {/* ES|QL Editor - uses context directly */}
      <EsqlEditorSection />

      {/* Toolbar - uses context directly */}
      <EuiFlexItem grow={false}>
        <InventoryToolbar />
      </EuiFlexItem>

      {/* Chart Error */}
      {waffleError && (
        <EuiFlexItem grow={false}>
          <ErrorCallout
            title={i18n.translate('xpack.infra.esqlInventory.chartError.title', {
              defaultMessage: 'Error loading chart',
            })}
            message={waffleError.message}
          />
        </EuiFlexItem>
      )}

      {/* Content Area */}
      <EuiFlexItem>
        {showChart ? (
          <ChartContainer>
            <WaffleMap
              result={waffleResult}
              legendConfig={inventory.legend}
              isLoading={waffleLoading}
              error={waffleError}
              formatter={valueFormatter}
              groupByFields={inventory.groupByFields}
              onFilter={handleFilter}
            />
          </ChartContainer>
        ) : (
          <EmptyQueryState />
        )}
      </EuiFlexItem>

      {/* Modals - use context directly */}
      {isLegendModalOpen && <LegendModal />}

      {isSaveQueryModalOpen && (
        <SaveQueryModal
          query={currentQuery.esql}
          entity={inventory.entityField}
          editingMetric={editingMetricId ? getCustomMetricById(editingMetricId) : null}
          initialUnit={inventory.selectedMetric?.unit}
          onSave={(name, query, entity, unit) => {
            if (editingMetricId) {
              updateCustomMetric(editingMetricId, { name, query, dimension: entity, unit });
            } else {
              saveCustomMetric(name, query, entity, unit);
            }
          }}
          onClose={closeSaveQueryModal}
        />
      )}
    </EuiFlexGroup>
  );
};
