/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CellActionsProps,
  UseDataGridColumnsCellActions,
  UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import { CellActions, useDataGridColumnsCellActions } from '@kbn/cell-actions';
import React, { useMemo } from 'react';
import type { CellActionFieldValue, CellActionsData } from '@kbn/cell-actions/src/types';
import type { EuiButtonIconProps } from '@elastic/eui';
import { PageScope } from '../../../data_view_manager/constants';
import type { SecurityCellActionMetadata } from '../../../app/actions/types';
import { SecurityCellActionType } from '../../../app/actions/constants';
import { useGetFieldSpec } from '../../hooks/use_get_field_spec';
import { useDataViewId } from '../../hooks/use_data_view_id';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';

// bridge exports for convenience
export * from '@kbn/cell-actions';
export * from '@kbn/cell-actions/constants';

export { SecurityCellActionType };

export interface SecurityCellActionsData {
  /**
   * The field name is necessary to fetch the FieldSpec from the Dataview.
   * Ex: `event.category`
   */
  field: string;

  value: CellActionFieldValue;
}

export interface SecurityCellActionsProps
  extends Omit<CellActionsProps, 'data' | 'metadata' | 'disabledActionTypes' | 'triggerId'> {
  sourcererScopeId?: PageScope;
  data: SecurityCellActionsData | SecurityCellActionsData[];
  triggerId: string;
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityCellActionMetadata;
  extraActionsIconType?: EuiButtonIconProps['iconType'];
  extraActionsColor?: EuiButtonIconProps['color'];
}

export interface UseDataGridColumnsSecurityCellActionsProps
  extends UseDataGridColumnsCellActionsProps {
  triggerId: string;
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityCellActionMetadata;
}

export const useDataGridColumnsSecurityCellActions: UseDataGridColumnsCellActions<UseDataGridColumnsSecurityCellActionsProps> =
  useDataGridColumnsCellActions;

export const SecurityCellActions: React.FC<SecurityCellActionsProps> = ({
  sourcererScopeId = PageScope.default,
  data,
  metadata,
  children,
  ...props
}) => {
  const oldGetFieldSpec = useGetFieldSpec(sourcererScopeId);
  const oldDataViewId = useDataViewId(sourcererScopeId);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView: experimentalDataView } = useDataView(sourcererScopeId);
  const dataViewId = newDataViewPickerEnabled ? experimentalDataView.id : oldDataViewId;

  // Make a dependency key to prevent unnecessary re-renders when data object is defined inline
  // It is necessary because the data object is an array or an object and useMemo would always re-render
  const dependencyKey = JSON.stringify(data);

  const fieldData: CellActionsData[] = useMemo(
    () =>
      (Array.isArray(data) ? data : [data])
        .map(({ field, value }) => ({
          field: newDataViewPickerEnabled
            ? experimentalDataView.fields?.getByName(field)?.toSpec()
            : oldGetFieldSpec(field),
          value,
        }))
        .filter((item): item is CellActionsData => !!item.field),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use the dependencyKey to prevent unnecessary re-renders
    [dependencyKey, oldGetFieldSpec, newDataViewPickerEnabled, experimentalDataView.fields]
  );

  const metadataWithDataView = useMemo(() => ({ ...metadata, dataViewId }), [dataViewId, metadata]);

  return fieldData.length > 0 ? (
    <CellActions data={fieldData} metadata={metadataWithDataView} {...props}>
      {children}
    </CellActions>
  ) : (
    <>{children}</>
  );
};
