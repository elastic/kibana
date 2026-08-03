/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CELL_HEIGHT_DEFAULT = 40;
const CELL_HEIGHT_COMPRESSED = 28;
const DEFAULT_ROW_COUNT = 5;
const HEIGHT_OF_X_AXIS_LEGEND = 28;
const HEIGHT_OF_TOP_LEGEND = 32;

export const getAnomalyChartStyling = (compressed: boolean = false) => {
  const heightOfEachCell = compressed ? CELL_HEIGHT_COMPRESSED : CELL_HEIGHT_DEFAULT;

  const calculateHeight = (count: number) => {
    return count > 0 ? count * heightOfEachCell : DEFAULT_ROW_COUNT * heightOfEachCell;
  };

  return {
    heightOfXAxisLegend: HEIGHT_OF_X_AXIS_LEGEND,
    heightOfTopLegend: HEIGHT_OF_TOP_LEGEND,
    heightOfEachCell,
    heightOfEntityNamesList: calculateHeight,
    heightOfHeatmap: (count: number) => calculateHeight(count) + HEIGHT_OF_X_AXIS_LEGEND,
  };
};

export const anomalyChartStyling = getAnomalyChartStyling(false);
