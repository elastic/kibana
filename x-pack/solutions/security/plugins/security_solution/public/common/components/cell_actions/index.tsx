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
import type { DataView } from '@kbn/data-views-plugin/public';
import { PageScope } from '../../../data_view_manager/constants';
import type { SecurityCellActionMetadata } from '../../../app/actions/types';
import { SecurityCellActionType } from '../../../app/actions/constants';
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

export interface SecurityCellActionsProps extends Omit<
  CellActionsProps,
  'data' | 'metadata' | 'disabledActionTypes' | 'triggerId'
> {
  sourcererScopeId?: PageScope;
  /**
   * An already loaded data view. When provided, the component does not retrieve one itself
   * (and `sourcererScopeId` is not used).
   */
  dataView?: DataView;
  data: SecurityCellActionsData | SecurityCellActionsData[];
  triggerId: string;
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityCellActionMetadata;
  extraActionsIconType?: EuiButtonIconProps['iconType'];
  extraActionsColor?: EuiButtonIconProps['color'];
}

export interface UseDataGridColumnsSecurityCellActionsProps extends UseDataGridColumnsCellActionsProps {
  triggerId: string;
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityCellActionMetadata;
}

export const useDataGridColumnsSecurityCellActions: UseDataGridColumnsCellActions<UseDataGridColumnsSecurityCellActionsProps> =
  useDataGridColumnsCellActions;

type SecurityCellActionsWithDataViewProps = Omit<SecurityCellActionsProps, 'sourcererScopeId'> & {
  dataView: DataView;
};

/**
 * Renders the cell actions using the provided data view. It does not retrieve any data view itself,
 * which means it renders the actions on its first render when the data view is already loaded.
 */
const SecurityCellActionsWithDataView: React.FC<SecurityCellActionsWithDataViewProps> = ({
  dataView,
  data,
  metadata,
  children,
  ...props
}) => {
  const { id: dataViewId } = dataView;

  // Make a dependency key to prevent unnecessary re-renders when data object is defined inline
  // It is necessary because the data object is an array or an object and useMemo would always re-render
  const dependencyKey = JSON.stringify(data);

  const fieldData: CellActionsData[] = useMemo(
    () =>
      (Array.isArray(data) ? data : [data])
        .map(({ field, value }) => ({
          field: dataView.fields?.getByName(field)?.toSpec(),
          value,
        }))
        .filter((item): item is CellActionsData => !!item.field),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use the dependencyKey to prevent unnecessary re-renders
    [dependencyKey, dataView.fields]
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

/**
 * Retrieves the data view for the scope itself. `useDataView` keeps its result in per-instance state that
 * starts empty, so this renders without actions first, then re-creates its children once the data view resolved.
 * Prefer passing `dataView` when it is already available.
 */
const SecurityCellActionsRetrievingDataView: React.FC<
  Omit<SecurityCellActionsProps, 'dataView'>
> = ({ sourcererScopeId = PageScope.default, ...props }) => {
  const { dataView } = useDataView(sourcererScopeId);

  return <SecurityCellActionsWithDataView {...props} dataView={dataView} />;
};

export const SecurityCellActions: React.FC<SecurityCellActionsProps> = ({
  dataView,
  sourcererScopeId,
  ...props
}) =>
  dataView ? (
    <SecurityCellActionsWithDataView {...props} dataView={dataView} />
  ) : (
    <SecurityCellActionsRetrievingDataView {...props} sourcererScopeId={sourcererScopeId} />
  );
