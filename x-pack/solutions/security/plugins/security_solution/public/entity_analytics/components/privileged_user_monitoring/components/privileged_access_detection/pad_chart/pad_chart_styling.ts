/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const padChartStyling = {
  heightOfNoResults: 300,
  heightOfXAxisLegend: 28,
  heightOfTopLegend: 32,
  heightOfEachCell: 40,
  heightOfUserNamesList: (userNames: string[]) =>
    userNames.length > 0
      ? userNames.length * padChartStyling.heightOfEachCell
      : padChartStyling.heightOfNoResults,
  heightOfHeatmap: (userNames: string[]) =>
    userNames.length > 0
      ? userNames.length * padChartStyling.heightOfEachCell + padChartStyling.heightOfXAxisLegend
      : padChartStyling.heightOfNoResults,
};
