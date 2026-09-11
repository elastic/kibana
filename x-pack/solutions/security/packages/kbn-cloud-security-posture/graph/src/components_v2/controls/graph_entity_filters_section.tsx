/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiComboBox,
  EuiFieldNumber,
  EuiFormRow,
  EuiSuperSelect,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  GRAPH_ASSET_CRITICALITY_OPTIONS,
  GRAPH_NEW_ENTITIES_WINDOW_OPTIONS,
  type GraphAssetCriticalityFilter,
  type GraphEntityFiltersState,
  type GraphNewEntitiesWindow,
} from './graph_entity_filters';

export interface GraphEntityFiltersSectionProps {
  filters: GraphEntityFiltersState;
  onFiltersChange: (next: GraphEntityFiltersState) => void;
}

const filtersTitle = i18n.translate('securitySolutionPackages.csp.graph.entityFilters.title', {
  defaultMessage: 'Filters',
});

const riskScoreLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.entityFilters.riskScoreMin',
  { defaultMessage: 'Risk score threshold' }
);

const assetCriticalityLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.entityFilters.assetCriticality',
  { defaultMessage: 'Asset criticality' }
);

const newEntitiesLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.entityFilters.newEntities',
  { defaultMessage: 'New entities' }
);

const newEntitiesPlaceholder = i18n.translate(
  'securitySolutionPackages.csp.graph.entityFilters.newEntitiesPlaceholder',
  { defaultMessage: 'Any time' }
);

export const GraphEntityFiltersSection = ({
  filters,
  onFiltersChange,
}: GraphEntityFiltersSectionProps) => {
  const { euiTheme } = useEuiTheme();

  const criticalityOptions = useMemo(
    () =>
      GRAPH_ASSET_CRITICALITY_OPTIONS.map((value) => ({
        label: value,
        value,
      })),
    []
  );

  const newEntitiesOptions = useMemo(
    () => [
      {
        value: '',
        inputDisplay: newEntitiesPlaceholder,
        dropdownDisplay: newEntitiesPlaceholder,
      },
      ...GRAPH_NEW_ENTITIES_WINDOW_OPTIONS.map((option) => ({
        value: option.value ?? '',
        inputDisplay: i18n.translate(
          'securitySolutionPackages.csp.graph.entityFilters.newEntitiesWindow',
          {
            defaultMessage: 'New in last {days} days',
            values: { days: option.label },
          }
        ),
        dropdownDisplay: i18n.translate(
          'securitySolutionPackages.csp.graph.entityFilters.newEntitiesWindow',
          {
            defaultMessage: 'New in last {days} days',
            values: { days: option.label },
          }
        ),
      })),
    ],
    []
  );

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
    >
      <EuiTitle size="xxs">
        <h4>{filtersTitle}</h4>
      </EuiTitle>

      <EuiFormRow label={riskScoreLabel} display="rowCompressed" fullWidth>
        <EuiFieldNumber
          compressed
          fullWidth
          min={0}
          max={100}
          step={0.1}
          value={filters.riskScoreMin ?? ''}
          placeholder={i18n.translate(
            'securitySolutionPackages.csp.graph.entityFilters.riskScorePlaceholder',
            { defaultMessage: 'Any risk score' }
          )}
          onChange={(e) => {
            const value = e.target.value;
            onFiltersChange({
              ...filters,
              riskScoreMin: value === '' ? null : Number(value),
            });
          }}
          data-test-subj="graphEntityFilterRiskScore"
        />
      </EuiFormRow>

      <EuiFormRow label={assetCriticalityLabel} display="rowCompressed" fullWidth>
        <EuiComboBox
          compressed
          fullWidth
          options={criticalityOptions}
          selectedOptions={filters.assetCriticality.map((value) => ({
            label: value,
            value,
          }))}
          onChange={(selected) => {
            onFiltersChange({
              ...filters,
              assetCriticality: selected.map(
                (option) => option.value as GraphAssetCriticalityFilter
              ),
            });
          }}
          isClearable
          data-test-subj="graphEntityFilterCriticality"
        />
      </EuiFormRow>

      <EuiFormRow label={newEntitiesLabel} display="rowCompressed" fullWidth>
        <EuiSuperSelect
          compressed
          fullWidth
          options={newEntitiesOptions}
          valueOfSelected={filters.newEntitiesWindow ?? ''}
          onChange={(value) => {
            onFiltersChange({
              ...filters,
              newEntitiesWindow: (value || null) as GraphNewEntitiesWindow,
            });
          }}
          data-test-subj="graphEntityFilterNewEntities"
        />
      </EuiFormRow>
    </div>
  );
};
