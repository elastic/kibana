/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiPanel,
  EuiFormRow,
  EuiSuperDatePicker,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { SortField } from '../types';
import { useInventoryContext } from './inventory_context';
import { EntitySelector, MetricSelector, GroupBySelector } from './selectors';

const SORT_FIELD_OPTIONS = [
  {
    id: 'metric',
    label: i18n.translate('xpack.infra.esqlInventory.sort.metric', { defaultMessage: 'Metric' }),
  },
  {
    id: 'entity',
    label: i18n.translate('xpack.infra.esqlInventory.sort.entity', {
      defaultMessage: 'Entity',
    }),
  },
];

/**
 * ES|QL Editor section with entity/metric selectors, time range, and query editor.
 * Consumes InventoryContext to avoid prop drilling.
 */
export const EsqlEditorSection: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const {
    inventory,
    currentQuery,
    isQueryManuallyEdited,
    entityFields,
    metricsForSelectedEntity,
    fieldsForGroupBy,
    customMetricsForEntity,
    commonlyUsedRanges,
    isLoadingFields,
    isLoadingMetrics,
    isLoadingGroupByFields,
    handleQueryChange,
    handleResetQuery,
    handleRefresh,
    handleEntityChange,
    handleMetricChange,
    handleGroupByChange,
    handleSortChange,
    handleTimeRangeChange,
    openSaveQueryModal,
    deleteCustomMetric,
  } = useInventoryContext();

  const { entityField, selectedMetric, groupByFields, sort, timeRange } = inventory;

  // Sort is only enabled when both entity and metric are selected
  const isSortEnabled = !!entityField && !!selectedMetric;
  const hasEntity = !!entityField;

  return (
    <EuiFlexItem grow={false}>
      <EuiPanel
        paddingSize="s"
        hasBorder
        css={css`
          background: ${euiTheme.colors.emptyShade};
        `}
      >
        <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" wrap>
          {/* Row 1: Controls (Entity, Metric, Time Range) */}
          <EuiFlexGroup gutterSize="xs" justifyContent="flexStart">
            {/* Entity Selector */}
            <EuiFlexItem grow={false}>
              <EntitySelector
                value={entityField}
                onChange={handleEntityChange}
                entityFields={entityFields}
                isLoading={isLoadingFields}
                isDisabled={false}
              />
            </EuiFlexItem>

            {/* Metric Selector */}
            <EuiFlexItem grow>
              <MetricSelector
                metricFields={metricsForSelectedEntity}
                customMetrics={customMetricsForEntity}
                selectedMetric={selectedMetric}
                onChange={handleMetricChange}
                onDeleteCustomMetric={deleteCustomMetric}
                isLoading={isLoadingFields || isLoadingMetrics}
                isDisabled={!entityField}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup
            gutterSize="xs"
            justifyContent="flexEnd"
            responsive={false}
            css={css`
              flex: 1;
            `}
          >
            {/* Time Range */}
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate('xpack.infra.esqlInventory.timeRange.label', {
                  defaultMessage: 'Time range',
                })}
              >
                <EuiSuperDatePicker
                  start={timeRange.from}
                  end={timeRange.to}
                  onTimeChange={handleTimeRangeChange}
                  onRefresh={handleRefresh}
                  commonlyUsedRanges={commonlyUsedRanges}
                  compressed
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>

        {/* Row 2: ES|QL Editor */}
        <div
          css={css`
            .kibanaCodeEditor {
              min-height: 10px;
            }
          `}
        >
          <ESQLLangEditor
            query={currentQuery}
            onTextLangQueryChange={handleQueryChange}
            onTextLangQuerySubmit={async () => handleRefresh()}
            expandToFitQueryOnMount
            hideRunQueryText
            data-test-subj="esqlInventoryEditor"
          />
        </div>

        <EuiSpacer size="s" />

        {/* Row 3: Group By | Sort | ---- | Reset */}
        <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween">
          {/* Left side: Group By and Sort */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {/* Group By Selector */}
              <EuiFlexItem grow={false}>
                <GroupBySelector
                  value={groupByFields}
                  onChange={handleGroupByChange}
                  fields={fieldsForGroupBy}
                  currentEntityField={entityField}
                  isLoading={isLoadingFields || isLoadingGroupByFields}
                  isDisabled={!entityField || !selectedMetric}
                />
              </EuiFlexItem>

              {/* Sort controls */}
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('xpack.infra.esqlInventory.sort.label', {
                        defaultMessage: 'Sort:',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonGroup
                      data-test-subj="infraEsqlInventorySortFieldGroup"
                      legend={i18n.translate('xpack.infra.esqlInventory.sort.fieldLegend', {
                        defaultMessage: 'Sort by field',
                      })}
                      options={SORT_FIELD_OPTIONS}
                      idSelected={sort.field}
                      onChange={(id) => handleSortChange({ ...sort, field: id as SortField })}
                      buttonSize="compressed"
                      isDisabled={!isSortEnabled}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={
                        !isSortEnabled
                          ? i18n.translate('xpack.infra.esqlInventory.sort.disabledTooltip', {
                              defaultMessage: 'Select an entity and metric to enable sorting',
                            })
                          : sort.direction === 'desc'
                          ? i18n.translate('xpack.infra.esqlInventory.sort.descendingTooltip', {
                              defaultMessage: 'Descending (click to change)',
                            })
                          : i18n.translate('xpack.infra.esqlInventory.sort.ascendingTooltip', {
                              defaultMessage: 'Ascending (click to change)',
                            })
                      }
                    >
                      <EuiButtonIcon
                        data-test-subj="infraEsqlInventorySortDirectionToggle"
                        aria-label={i18n.translate(
                          'xpack.infra.esqlInventory.sort.directionAriaLabel',
                          {
                            defaultMessage: 'Toggle sort direction',
                          }
                        )}
                        iconType={sort.direction === 'desc' ? 'sortDown' : 'sortUp'}
                        onClick={() =>
                          handleSortChange({
                            ...sort,
                            direction: sort.direction === 'desc' ? 'asc' : 'desc',
                          })
                        }
                        display="base"
                        size="s"
                        isDisabled={!isSortEnabled}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              {/* Manually edited badge */}
              {isQueryManuallyEdited && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="accent">
                    {i18n.translate('xpack.infra.esqlInventory.editor.manuallyEdited', {
                      defaultMessage: 'Manually edited',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}

              {/* Save button for manually edited queries */}
              {isQueryManuallyEdited && hasEntity && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="infraEsqlInventorySaveQueryButton"
                    size="s"
                    onClick={() => openSaveQueryModal()}
                    iconType="save"
                    color="success"
                  >
                    {i18n.translate('xpack.infra.esqlInventory.editor.saveAsCustom', {
                      defaultMessage: 'Save as Custom Metric',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Right side: Reset */}
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="infraEsqlInventoryResetQueryButton"
              onClick={handleResetQuery}
              isDisabled={!isQueryManuallyEdited}
              iconType="refresh"
              size="s"
            >
              {i18n.translate('xpack.infra.esqlInventory.editor.resetQuery', {
                defaultMessage: 'Reset',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};
