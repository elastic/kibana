/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewPicker as UnifiedDataViewPicker } from '@kbn/unified-search-plugin/public';
import React, { useCallback, useRef, useMemo, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { DataView } from '@kbn/data-views-plugin/public';
import type { DataViewManagerScopeName } from '../../constants';
import { useKibana } from '../../../common/lib/kibana';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../../constants';
import { useDataViewSpec } from '../../hooks/use_data_view_spec';
import { sharedStateSelector } from '../../redux/selectors';
import { sharedDataViewManagerSlice } from '../../redux/slices';
import { useSelectDataView } from '../../hooks/use_select_data_view';
import { DATA_VIEW_PICKER_TEST_ID } from './constants';
import { useManagedDataViews } from '../../hooks/use_managed_data_views';
import { useSavedDataViews } from '../../hooks/use_saved_data_views';
import { DEFAULT_SECURITY_DATA_VIEW, LOADING } from './translations';

interface DataViewPickerProps {
  /**
   * The scope of the data view picker
   */
  scope: DataViewManagerScopeName;
  /**
   * Optional callback when the data view picker is closed
   */
  onClosePopover?: () => void;
  /**
   * Force disable picker
   */
  disabled?: boolean;
}

export const DataViewPicker = memo(({ scope, onClosePopover, disabled }: DataViewPickerProps) => {
  const dispatch = useDispatch();
  const selectDataView = useSelectDataView();

  const {
    services: { dataViewEditor, data, dataViewFieldEditor, fieldFormats },
  } = useKibana();
  const closeDataViewEditor = useRef<() => void | undefined>();
  const closeFieldEditor = useRef<() => void | undefined>();

  const { dataViewSpec, status } = useDataViewSpec(scope);

  const dataViewId = dataViewSpec?.id;

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (newDataView) => {
        dispatch(sharedDataViewManagerSlice.actions.addDataView(newDataView));
        selectDataView({ id: newDataView.id, scope: [scope] });
      },
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, dispatch, scope, selectDataView]);

  const handleChangeDataView = useCallback(
    (id: string) => {
      selectDataView({ id, scope: [scope] });
    },
    [scope, selectDataView]
  );

  const editField = useCallback(
    async (fieldName?: string, _uiAction: 'edit' | 'add' = 'edit') => {
      if (!dataViewId) {
        return;
      }

      const dataViewInstance = await data.dataViews.get(dataViewId);

      closeFieldEditor.current = await dataViewFieldEditor.openEditor({
        ctx: {
          dataView: dataViewInstance,
        },
        fieldName,
        onSave: async () => {
          if (!dataViewInstance.id) {
            return;
          }

          handleChangeDataView(dataViewInstance.id);
        },
      });
    },
    [dataViewId, data.dataViews, dataViewFieldEditor, handleChangeDataView]
  );

  /**
   * Selects data view again. After changes are made to the data view, this results in cache invalidation and will force the reload everywhere.
   */
  const handleDataViewModified = useCallback(
    (updatedDataView: DataView) => {
      selectDataView({ id: updatedDataView.id, scope: [scope] });
    },
    [scope, selectDataView]
  );

  const handleAddField = useCallback(() => editField(undefined, 'add'), [editField]);

  const triggerConfig = useMemo(() => {
    if (status === 'loading') {
      return { label: LOADING };
    }

    if (dataViewSpec.id === DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID) {
      return {
        label: DEFAULT_SECURITY_DATA_VIEW,
      };
    }

    return {
      label: dataViewSpec?.name || dataViewSpec?.id || 'Data view',
    };
  }, [dataViewSpec.id, dataViewSpec?.name, status]);

  const { adhocDataViews: adhocDataViewSpecs } = useSelector(sharedStateSelector);

  const adhocDataViews = useMemo(() => {
    return adhocDataViewSpecs.map((spec) => new DataView({ spec, fieldFormats }));
  }, [adhocDataViewSpecs, fieldFormats]);

  const managedDataViews = useManagedDataViews();
  const savedDataViews = useSavedDataViews();

  return (
    <div data-test-subj={DATA_VIEW_PICKER_TEST_ID}>
      <UnifiedDataViewPicker
        isDisabled={status !== 'ready' || disabled}
        currentDataViewId={dataViewId || DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID}
        trigger={triggerConfig}
        onChangeDataView={handleChangeDataView}
        onEditDataView={handleDataViewModified}
        onAddField={handleAddField}
        onDataViewCreated={createNewDataView}
        adHocDataViews={adhocDataViews}
        savedDataViews={savedDataViews}
        managedDataViews={managedDataViews}
        onClosePopover={onClosePopover}
      />
    </div>
  );
});

DataViewPicker.displayName = 'DataviewPicker';
