/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FormulaIndexPatternColumn,
  CountIndexPatternColumn,
  MetricState,
  OperationType,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';

import type { DataView } from '@kbn/data-views-plugin/common';

import type { Query } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getColorPalette } from '../synthetics/single_metric_config';
import { FORMULA_COLUMN, RECORDS_FIELD } from '../constants';
import type { ColumnFilter, MetricOption } from '../../types';
import type { SeriesConfig } from '../../../../..';
import type { LayerConfig } from '../lens_attributes';
import { buildNumberColumn, LensAttributes, parseCustomFieldName } from '../lens_attributes';

export class SingleMetricLensAttributes extends LensAttributes {
  columnId: string;
  metricStateOptions?: MetricOption['metricStateOptions'];

  constructor(
    layerConfigs: LayerConfig[],
    reportType: string,
    dslFilters?: QueryDslQueryContainer[]
  ) {
    super(layerConfigs, reportType, dslFilters);
    this.layers = {};
    this.reportType = reportType;

    this.layerConfigs = layerConfigs;
    this.isMultiSeries = layerConfigs.length > 1;

    this.columnId = 'layer-0-column-1';

    this.globalFilter = this.getGlobalFilter(this.isMultiSeries);
    const layer0 = this.getSingleMetricLayer()!;

    this.layers = {
      layer0,
    };
    this.visualization = this.getMetricState();
  }

  getSingleMetricLayer(): PersistedIndexPatternLayer | undefined {
    const { seriesConfig, selectedMetricField, operationType, dataView, name } =
      this.layerConfigs[0];

    const metricOption = parseCustomFieldName(seriesConfig, selectedMetricField);

    if (!Array.isArray(metricOption)) {
      const {
        columnFilter,
        columnField,
        columnLabel,
        columnType,
        formula,
        metricStateOptions,
        format,
        emptyAsNull = true,
      } = metricOption;

      this.metricStateOptions = metricStateOptions;

      if (columnType === FORMULA_COLUMN && formula) {
        return {
          ...this.getFormulaLayer({
            formula,
            label: name ?? columnLabel,
            dataView,
            format,
            filter: columnFilter,
          }),
        };
      }

      const getSourceField = () => {
        if (
          selectedMetricField.startsWith('Records') ||
          selectedMetricField.startsWith('records')
        ) {
          return 'Records';
        }
        return columnField || selectedMetricField;
      };

      const sourceField = getSourceField();

      const isPercentileColumn = operationType?.includes('th');

      if (isPercentileColumn) {
        return {
          ...this.getPercentileLayer({
            sourceField,
            operationType,
            seriesConfig,
            columnLabel,
            columnFilter,
          }),
        };
      }

      return {
        columns: {
          [this.columnId]:
            sourceField === RECORDS_FIELD
              ? ({
                  ...buildNumberColumn(sourceField),
                  customLabel: true,
                  label: name ?? columnLabel,
                  operationType: 'count',
                  filter: columnFilter,
                  params: {
                    emptyAsNull: Boolean(emptyAsNull),
                  },
                } as CountIndexPatternColumn)
              : {
                  ...buildNumberColumn(sourceField),
                  customLabel: true,
                  label: name ?? columnLabel,
                  operationType: operationType || 'median',
                  filter: columnFilter,
                },
        },
        columnOrder: [this.columnId],
        incompleteColumns: {},
      } satisfies PersistedIndexPatternLayer;
    }
  }

  getFormulaLayer({
    formula,
    label,
    dataView,
    format,
    filter,
  }: {
    formula: string;
    label?: string;
    format?: string;
    filter?: Query;
    dataView: DataView;
  }) {
    const layer = {
      columnOrder: [this.columnId],
      columns: {
        [this.columnId]: {
          label: label ?? '',
          customLabel: label != null,
          dataType: 'number',
          filter,
          isBucketed: false,
          operationType: 'formula',
          params: {
            formula,
            isFormulaBroken: false,
            format:
              format === 'percent' || !format
                ? {
                    id: 'percent',
                    params: {
                      decimals: 3,
                    },
                  }
                : undefined,
          },
          references: [],
        } satisfies FormulaIndexPatternColumn,
      },
    };

    return layer!;
  }

  getPercentileLayer({
    sourceField,
    operationType,
    seriesConfig,
    columnLabel,
    columnFilter,
  }: {
    sourceField: string;
    operationType?: OperationType;
    seriesConfig: SeriesConfig;
    columnLabel?: string;
    columnFilter?: ColumnFilter;
  }) {
    return {
      columns: {
        [this.columnId]: {
          ...this.getPercentileNumberColumn(sourceField, operationType!, seriesConfig),
          label: columnLabel ?? '',
          filter: columnFilter,
          customLabel: true,
        },
      },
      columnOrder: [this.columnId],
      incompleteColumns: {},
    };
  }

  getMetricState(): MetricState {
    const { color } = this.layerConfigs[0];

    const metricStateOptions: MetricOption['metricStateOptions'] = {
      ...(this.metricStateOptions ?? {}),
      ...(color ? { colorMode: 'Labels', palette: getColorPalette(color) } : {}),
    };

    return {
      accessor: this.columnId,
      layerId: 'layer0',
      layerType: 'data',
      ...metricStateOptions,
      size: 's',
    };
  }
}
