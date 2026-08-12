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
  /**
   * When set, builds a real Lens metric chart fed by an ES|QL `ROW` query with this
   * value (no risk-score index / history). Used by the EA Facelift flyout prototype.
   */
  staticScore?: number;
}

const severityPalette = {
  type: 'palette' as const,
  name: 'custom',
  params: {
    steps: 3,
    name: 'custom',
    reverse: false,
    rangeType: 'number' as const,
    rangeMin: 0,
    rangeMax: null,
    progression: 'fixed' as const,
    colorStops: SEVERITY_UI_SORT_ORDER.map((riskSeverity) => ({
      color: RISK_SEVERITY_COLOUR[riskSeverity],
      stop: RISK_SCORE_RANGES[riskSeverity].start,
    })),
    stops: SEVERITY_UI_SORT_ORDER.map((riskSeverity) => ({
      color: RISK_SEVERITY_COLOUR[riskSeverity],
      stop: RISK_SCORE_RANGES[riskSeverity].stop,
    })),
    continuity: 'above' as const,
    maxSteps: 5,
  },
};

/** Lens metric with a static ES|QL ROW — real Lens UI, no index dependency. */
const getStaticRiskScoreSummaryAttributes = ({
  severity,
  riskEntity,
  metricLabel,
  staticScore,
}: Required<Pick<GetRiskScoreSummaryAttributesProps, 'staticScore'>> &
  Pick<GetRiskScoreSummaryAttributesProps, 'severity' | 'riskEntity' | 'metricLabel'>): LensAttributes => {
  const layerId = `layer-id1-${uuidv4()}`;
  const columnId = `column-id1-${uuidv4()}`;
  const dataViewId = `dataview-id-${uuidv4()}`;
  const label = metricLabel ?? `${capitalize(riskEntity)} Risk`;
  const esqlQuery = `ROW risk_score = ${Number(staticScore)}`;

  return {
    title: 'Risk score summary',
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId,
        layerType: 'data',
        metricAccessor: columnId,
        palette: severityPalette,
        subtitle: severity,
      },
      query: {
        esql: esqlQuery,
      },
      filters: [],
      datasourceStates: {
        textBased: {
          layers: {
            [layerId]: {
              columns: [
                {
                  columnId,
                  fieldName: 'risk_score',
                  label,
                  customLabel: true,
                  inMetricDimension: true,
                  meta: {
                    type: 'number',
                  },
                  params: {
                    format: {
                      id: 'number',
                      params: {
                        decimals: 2,
                        compact: false,
                      },
                    },
                  },
                },
              ],
              query: {
                esql: esqlQuery,
              },
              index: dataViewId,
            },
          },
        },
      },
      internalReferences: [
        {
          type: 'index-pattern',
          id: dataViewId,
          name: `indexpattern-datasource-layer-${layerId}`,
        },
      ],
      adHocDataViews: {
        [dataViewId]: {
          id: dataViewId,
        },
      },
    },
    references: [],
  };
};

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
  staticScore,
}) => {
  if (staticScore != null && Number.isFinite(staticScore)) {
    return getStaticRiskScoreSummaryAttributes({
      staticScore,
      severity,
      riskEntity,
      metricLabel,
    });
  }

  const layerIds = [`layer-id1-${uuidv4()}`, `layer-id2-${uuidv4()}`];
  const internalReferenceId = `internal-reference-id-${uuidv4()}`;
  const columnIds = [`column-id1-${uuidv4()}`, `column-id2-${uuidv4()}`, `column-id3-${uuidv4()}`];
  const useEntityStoreSource =
    dataSource === 'entity_store' || (dataSource === 'auto' && !!entityId);
  const sourceField = useEntityStoreSource
    ? ENTITY_STORE_V2_RISK_SCORE_FIELD
    : EntityTypeToScoreField[riskEntity];
  const dataViewIndexPattern = useEntityStoreSource
    ? getEntityStoreV2IndexPattern(spaceId)
    : `risk-score.risk-score-${spaceId ?? 'default'}`;
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
        palette: severityPalette,
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
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: dataViewIndexPattern,
        },
      },
    },
    references: [],
  };
};
