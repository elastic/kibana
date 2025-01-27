/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewDescriptor } from '../data_views/models/data_view_descriptor';
import { DataSourceSelectionStrategy, DataViewSelectionPayload } from './types';

export class DataViewSelection implements DataSourceSelectionStrategy {
  selectionType: 'dataView';
  selection: {
    dataView: DataViewDescriptor;
  };

  private constructor(dataViewDescriptor: DataViewDescriptor) {
    this.selectionType = 'dataView';
    this.selection = {
      dataView: dataViewDescriptor,
    };
  }

  toDataviewSpec() {
    return this.selection.dataView.toDataviewSpec();
  }

  toPlainSelection() {
    return {
      selectionType: this.selectionType,
      selection: {
        dataView: this.selection.dataView.toPlain(),
      },
    };
  }

  public static fromSelection(selection: DataViewSelectionPayload) {
    const { dataView } = selection;

    const dataViewDescriptor = DataViewDescriptor.create(dataView);
    return DataViewSelection.create(dataViewDescriptor);
  }

  public static create(dataViewDescriptor: DataViewDescriptor) {
    return new DataViewSelection(dataViewDescriptor);
  }
}
