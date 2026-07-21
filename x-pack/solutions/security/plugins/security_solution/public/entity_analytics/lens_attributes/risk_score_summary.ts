/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { capitalize } from 'lodash';

import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { SEVERITY_UI_SORT_ORDER, RISK_SCORE_RANGES, RISK_SEVERITY_COLOUR } from '../common/utils';
import type { EntityType } from '../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../common/search_strategy';
import { EntityTypeToScoreField, RiskScoreFields } from '../../../common/search_strategy';

/** When true, use entity store v2 index and entity.risk.* fields instead of risk-score.risk-score-* */
const ENTITY_STORE_V2_RISK_SCORE_FIELD = 'entity.risk.calculated_score_norm';
const ENTITY_STORE_RESOLUTION_RISK_SCORE_FIELD =
  'entity.relationships.resolution.risk.calculated_score_norm';
/** Short runtime-field name — Lens ad-hoc data views struggle with deep nested paths. */
const RESOLUTION_SCORE_RUNTIME_FIELD = 'resolution_group_risk_score_norm';

const getEntityStoreV2IndexPattern = (spaceId?: string) =>
  getEntitiesAlias(ENTITY_LATEST, spaceId ?? 'default');

interface GetRiskScoreSummaryAttributesProps {
  query?: string;
  spaceId?: string;
  severity?: RiskSeverity;
  riskEntity: EntityType;
  entityId?: string;
  dataSource?: 'auto' | 'entity_store' | 'risk_index';
  metricLabel?: string;
  /** Override the metric field when reading from the entity store (e.g. resolution-group risk). */
  sourceField?: string;
}

export const getRiskScoreSummaryAttributes: (
  props: GetRiskScoreSummaryAttributesProps
) => LensAttributes = ({
  spaceId,
  query,
  severity,
  riskEntity,
  entityId,
  dataSource = 'auto',
  metricLabel,
  sourceField: sourceFieldOverride,
}) => {
  const layerIds = [`layer-id1-${uuidv4()}`, `layer-id2-${uuidv4()}`];
  const internalReferenceId = `internal-reference-id-${uuidv4()}`;
  const columnIds = [`column-id1-${uuidv4()}`, `column-id2-${uuidv4()}`, `column-id3-${uuidv4()}`];
  const useEntityStoreSource =
    dataSource === 'entity_store' || (dataSource === 'auto' && !!entityId);
  const useResolutionRuntimeField =
    sourceFieldOverride === ENTITY_STORE_RESOLUTION_RISK_SCORE_FIELD;
  const sourceField = useResolutionRuntimeField
    ? RESOLUTION_SCORE_RUNTIME_FIELD
    : sourceFieldOverride
      ? sourceFieldOverride
      : useEntityStoreSource
        ? ENTITY_STORE_V2_RISK_SCORE_FIELD
        : EntityTypeToScoreField[riskEntity];
  const dataViewIndexPattern = useEntityStoreSource
    ? getEntityStoreV2IndexPattern(spaceId)
    : `risk-score.risk-score-${spaceId ?? 'default'}`;
  const runtimeFieldMap = useResolutionRuntimeField
    ? {
        [RESOLUTION_SCORE_RUNTIME_FIELD]: {
          type: 'double' as const,
          script: {
            source:
              "if (doc.containsKey('entity.relationships.resolution.risk.calculated_score_norm') && doc['entity.relationships.resolution.risk.calculated_score_norm'].size() != 0) { emit(doc['entity.relationships.resolution.risk.calculated_score_norm'].value); }",
          },
        },
      }
    : {};
  return {
    title: 'Risk score summary',
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId: layerIds[0],
        layerType: 'data',
        metricAccessor: columnIds[0],
        trendlineLayerId: layerIds[1],
        trendlineLayerType: 'metricTrendline',
        trendlineTimeAccessor: columnIds[1],
        trendlineMetricAccessor: columnIds[2],
        palette: {
          type: 'palette',
          name: 'custom',
          params: {
            steps: 3,
            name: 'custom',
            reverse: false,
            rangeType: 'number',
            rangeMin: 0,
            rangeMax: null,
            progression: 'fixed',
            colorStops: SEVERITY_UI_SORT_ORDER.map((riskSeverity) => ({
              color: RISK_SEVERITY_COLOUR[riskSeverity],
              stop: RISK_SCORE_RANGES[riskSeverity].start,
            })),
            stops: SEVERITY_UI_SORT_ORDER.map((riskSeverity) => ({
              color: RISK_SEVERITY_COLOUR[riskSeverity],
              stop: RISK_SCORE_RANGES[riskSeverity].stop,
            })),
            continuity: 'above',
            maxSteps: 5,
          },
        },
        subtitle: severity,
      },
      query: {
        query: query ?? '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            [layerIds[0]]: {
              columns: {
                [columnIds[0]]: {
                  label: metricLabel ?? `${capitalize(riskEntity)} Risk`,
                  dataType: 'number',
                  operationType: 'last_value',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField,
                  reducedTimeRange: '',
                  params: {
                    sortField: '@timestamp',
                    format: {
                      id: 'number',
                      params: {
                        decimals: 2,
                        compact: false,
                      },
                    },
                    emptyAsNull: true,
                  },
                  customLabel: true,
                },
              },
              columnOrder: [columnIds[0]],
              incompleteColumns: {},
            },
            [layerIds[1]]: {
              linkToLayers: [layerIds[0]],
              columns: {
                [columnIds[1]]: {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: RiskScoreFields.timestamp,
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                    dropPartials: false,
                  },
                },
                [columnIds[2]]: {
                  label: 'Risk value',
                  dataType: 'number',
                  operationType: 'last_value',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField,
                  filter: {
                    query: '',
                    language: 'kuery',
                  },
                  timeShift: '',
                  reducedTimeRange: '',
                  params: {
                    sortField: '@timestamp',
                    format: {
                      id: 'number',
                      params: {
                        decimals: 0,
                        compact: false,
                      },
                    },
                  },
                  customLabel: true,
                },
              },
              columnOrder: [columnIds[1], columnIds[2]],
              sampling: 1,
              ignoreGlobalFilters: false,
              incompleteColumns: {},
            },
          },
        },
        indexpattern: {
          layers: {},
        },
        textBased: {
          layers: {},
        },
      },
      internalReferences: [
        {
          type: 'index-pattern',
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerIds[0]}`,
        },
        {
          type: 'index-pattern',
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerIds[1]}`,
        },
      ],
      adHocDataViews: {
        [internalReferenceId]: {
          id: internalReferenceId,
          title: dataViewIndexPattern,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap,
          fieldAttrs: useResolutionRuntimeField
            ? {
                [RESOLUTION_SCORE_RUNTIME_FIELD]: {
                  customLabel: 'Resolution group risk score',
                },
              }
            : {},
          allowNoIndex: false,
          name: dataViewIndexPattern,
        },
      },
    },
    references: [],
  };
};
