/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FormulaIndexPatternColumn } from '@kbn/lens-plugin/public';

export function getDistributionInPercentageColumn({
  label,
  layerId,
  dataView,
  columnFilter,
  formula,
  format,
}: {
  label?: string;
  columnFilter?: string;
  layerId: string;
  dataView: DataView;
  formula?: string;
  format?: string;
}): FormulaIndexPatternColumn {
  let lensFormula = formula ?? 'count() / overall_sum(count())';

  if (columnFilter) {
    lensFormula =
      formula ?? `count(kql='${columnFilter}') / overall_sum(count(kql='${columnFilter}'))`;
  }

  return {
    dataType: 'number',
    isBucketed: false,
    label: label ?? '',
    customLabel: label != null,
    operationType: 'formula',
    params: {
      formula: lensFormula,
      isFormulaBroken: false,
      format:
        format === 'percent' || !format
          ? {
              id: 'percent',
              params: {
                decimals: 0,
              },
            }
          : undefined,
    },
    references: [],
  } satisfies FormulaIndexPatternColumn;
}
