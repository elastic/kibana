/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { FieldConflictsInfo } from '@kbn/securitysolution-list-utils';
import type { GetGenericComboBoxPropsReturn } from '../get_generic_combo_box_props';

export interface FieldBaseProps {
  indexPattern: DataViewBase | undefined;
  fieldTypeFilter?: string[];
  isRequired?: boolean;
  selectedField?: DataViewFieldBase | undefined;
  fieldInputWidth?: number;
  showMappingConflicts?: boolean;
  onChange: (a: DataViewFieldBase[]) => void;
}

export interface ComboBoxFields {
  availableFields: DataViewField[];
  selectedFields: DataViewField[];
}

export interface GetFieldComboBoxPropsReturn extends GetGenericComboBoxPropsReturn {
  disabledLabelTooltipTexts: { [label: string]: string };
  mappingConflictsTooltipInfo: { [label: string]: FieldConflictsInfo[] };
}

export interface DataViewField extends DataViewFieldBase {
  esTypes?: string[];
}
