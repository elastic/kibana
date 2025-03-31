/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewPicker as UnifiedDataViewPicker } from '@kbn/unified-search-plugin/public';
import React, { useCallback, useRef, useMemo, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { DataView, type DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataViewManagerScopeName } from '../../constants';
import { useKibana } from '../../../common/lib/kibana';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../../constants';
import { useDataView } from '../../hooks/use_data_view';
import { sharedStateSelector } from '../../redux/selectors';
import { sharedDataViewManagerSlice } from '../../redux/slices';
import { useSelectDataView } from '../../hooks/use_select_data_view';

export const DataViewPicker = memo((props: { scope: DataViewManagerScopeName }) => {
  const dispatch = useDispatch();
  const selectDataView = useSelectDataView();

  const {
    services: { dataViewEditor, data, dataViewFieldEditor, fieldFormats },
  } = useKibana();
  const closeDataViewEditor = useRef<() => void | undefined>();
  const closeFieldEditor = useRef<() => void | undefined>();

  const { dataView, status } = useDataView(props.scope);

  const dataViewId = dataView?.id;

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (newDataView) => {
        dispatch(sharedDataViewManagerSlice.actions.addDataView(newDataView));
        selectDataView({ id: newDataView.id, scope: [props.scope] });
      },
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, dispatch, props.scope, selectDataView]);

  const handleChangeDataView = useCallback(
    (id: string) => {
      selectDataView({ id, scope: [props.scope] });
    },
    [props.scope, selectDataView]
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

  const handleAddField = useCallback(() => editField(undefined, 'add'), [editField]);

  /**
   * Selects data view again. After changes are made to the data view, this results in cache invalidation and will force the reload everywhere.
   */
  const handleDataViewModified = useCallback(
    (updatedDataView: DataView) => {
      selectDataView({ id: updatedDataView.id, scope: [props.scope] });
    },
    [props.scope, selectDataView]
  );

  const triggerConfig = useMemo(() => {
    if (status === 'loading') {
      return { label: 'Loading' };
    }

    if (dataView.id === DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID) {
      return {
        label: 'Default Security Data View',
      };
    }

    return {
      label: dataView?.name || dataView?.id || 'Data view',
    };
  }, [dataView.id, dataView?.name, status]);

  const { adhocDataViews: adhocDataViewSpecs, dataViews } = useSelector(sharedStateSelector);

  const savedDataViews = useMemo(() => {
    const managed: DataViewListItem[] = dataViews.map((spec) => ({
      id: spec.id ?? '',
      title: spec.title ?? '',
      name: spec.name,
    }));

    return managed;
  }, [dataViews]);

  const adhocDataViews = useMemo(() => {
    return adhocDataViewSpecs.map((spec) => new DataView({ spec, fieldFormats }));
  }, [adhocDataViewSpecs, fieldFormats]);

  return (
    <UnifiedDataViewPicker
      isDisabled={status !== 'ready'}
      currentDataViewId={dataViewId || DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID}
      trigger={triggerConfig}
      onChangeDataView={handleChangeDataView}
      onEditDataView={handleDataViewModified}
      onAddField={handleAddField}
      onDataViewCreated={createNewDataView}
      adHocDataViews={adhocDataViews}
      savedDataViews={savedDataViews}
    />
  );
});

DataViewPicker.displayName = 'DataviewPicker';
