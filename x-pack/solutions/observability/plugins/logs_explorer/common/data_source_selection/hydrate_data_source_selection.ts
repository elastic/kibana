/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from './all_dataset_selection';
import { DataViewSelection } from './data_view_selection';
import { SingleDatasetSelection } from './single_dataset_selection';
import { DataSourceSelectionPlain } from './types';
import { UnresolvedDatasetSelection } from './unresolved_dataset_selection';

export const hydrateDataSourceSelection = (
  dataSourceSelection: DataSourceSelectionPlain,
  allSelection: AllDatasetSelection
) => {
  if (dataSourceSelection.selectionType === 'all') {
    return allSelection;
  } else if (dataSourceSelection.selectionType === 'single') {
    return SingleDatasetSelection.fromSelection(dataSourceSelection.selection);
  } else if (dataSourceSelection.selectionType === 'dataView') {
    return DataViewSelection.fromSelection(dataSourceSelection.selection);
  } else {
    return UnresolvedDatasetSelection.fromSelection(dataSourceSelection.selection);
  }
};
