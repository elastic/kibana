/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewPicker as USDataViewPicker } from '@kbn/unified-search-plugin/public';
import React, { useCallback, useRef, useMemo, memo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataViewPickerScopeName } from '../../constants';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../../constants';
import { selectDataViewAsync, shared } from '../../redux/reducer';
import { useDataView } from '../../hooks/use_data_view';
import { sharedStateSelector } from '../../redux/selectors';

export const DataViewPicker = memo((props: { scope: DataViewPickerScopeName }) => {
  const dispatch = useDispatch();

  const {
    services: { dataViewEditor, data, dataViewFieldEditor },
  } = useKibana();

  const closeDataViewEditor = useRef<() => void | undefined>();
  const closeFieldEditor = useRef<() => void | undefined>();

  // TODO: should this be implemented like that? If yes, we need to source dataView somehow or implement the same thing based on the existing state value.
  // const canEditDataView =
  // Boolean(dataViewEditor?.userPermissions.editDataView()) || !dataView.isPersisted();
  const canEditDataView = true;

  const { dataView } = useDataView(props.scope);

  const dataViewId = dataView?.id;

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (newDataView) => {
        dispatch(shared.actions.addDataView(newDataView));
        dispatch(selectDataViewAsync({ id: newDataView.id, scope: props.scope }));
        // TODO: reload data views
      },
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, dispatch, props.scope]);

  const onFieldEdited = useCallback(() => {}, []);

  const editField = useMemo(() => {
    if (!canEditDataView) {
      return;
    }
    return async (fieldName?: string, _uiAction: 'edit' | 'add' = 'edit') => {
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
          onFieldEdited();
        },
      });
    };
  }, [canEditDataView, dataViewId, data.dataViews, dataViewFieldEditor, onFieldEdited]);

  const addField = useMemo(
    () => (canEditDataView && editField ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataView]
  );

  const handleChangeDataView = useCallback(
    (id: string) => {
      dispatch(selectDataViewAsync({ id, scope: props.scope }));
    },
    [dispatch, props.scope]
  );

  const handleEditDataView = useCallback(() => {}, []);

  const triggerConfig = useMemo(() => {
    return {
      label: dataView?.name ?? dataView?.id ?? 'Data view',
    };
  }, [dataView]);

  const { adhocDataViews: adhocDataViewSpecs, dataViews } = useSelector(sharedStateSelector);

  const [adhocDataViews, setAdhocDataViews] = useState<DataView[]>([]);
  const [managedDataViews, setManagedDataViews] = useState<DataViewListItem[]>([]);

  useEffect(() => {
    (async () => {
      const adhoc = await Promise.all(
        adhocDataViewSpecs.map((dvSpec) => data.dataViews.create(dvSpec))
      );
      setAdhocDataViews(adhoc);

      const managed: DataViewListItem[] = dataViews.map((spec) => ({
        id: spec.id ?? '',
        title: spec.title ?? '',
        name: spec.name,
      }));
      setManagedDataViews(managed);
    })();
  }, [data.dataViews, adhocDataViewSpecs, dataViews]);

  return (
    <USDataViewPicker
      currentDataViewId={dataViewId || DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID}
      trigger={triggerConfig}
      onChangeDataView={handleChangeDataView}
      onEditDataView={handleEditDataView}
      onAddField={addField}
      onDataViewCreated={createNewDataView}
      adHocDataViews={adhocDataViews}
      savedDataViews={managedDataViews}
    />
  );
});

DataViewPicker.displayName = 'DataviewPicker';
