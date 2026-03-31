/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CELL_HEIGHT_DEFAULT = 40;
const CELL_HEIGHT_COMPRESSED = 28;
const HEIGHT_OF_NO_RESULTS = 300;
const HEIGHT_OF_X_AXIS_LEGEND = 28;
const HEIGHT_OF_TOP_LEGEND = 32;

export const getAnomalyChartStyling = (compressed: boolean = false) => {
  const heightOfEachCell = compressed ? CELL_HEIGHT_COMPRESSED : CELL_HEIGHT_DEFAULT;
  return {
    heightOfNoResults: HEIGHT_OF_NO_RESULTS,
    heightOfXAxisLegend: HEIGHT_OF_X_AXIS_LEGEND,
    heightOfTopLegend: HEIGHT_OF_TOP_LEGEND,
    heightOfEachCell,
    heightOfEntityNamesList: (count: number) =>
      count > 0 ? count * heightOfEachCell : HEIGHT_OF_NO_RESULTS,
    heightOfHeatmap: (count: number) =>
      count > 0 ? count * heightOfEachCell + HEIGHT_OF_X_AXIS_LEGEND : HEIGHT_OF_NO_RESULTS,
  };
};

export const anomalyChartStyling = getAnomalyChartStyling(false);
