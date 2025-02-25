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
import type { DataViewPickerScopeName } from '../../constants';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../../constants';
import { selectDataViewAsync } from '../../redux/actions';
import { useDataView } from '../../hooks/use_data_view';
import { sharedStateSelector } from '../../redux/selectors';
import { shared } from '../../redux/slices';

export const DataViewPicker = memo((props: { scope: DataViewPickerScopeName }) => {
  const dispatch = useDispatch();

  const {
    services: { dataViewEditor, data, dataViewFieldEditor, fieldFormats },
  } = useKibana();

  const closeDataViewEditor = useRef<() => void | undefined>();
  const closeFieldEditor = useRef<() => void | undefined>();

  // TODO: this should be disabled for the default data views probably, eg. `security-solution-default`
  // const canEditDataView =
  // Boolean(dataViewEditor?.userPermissions.editDataView()) || !dataView.isPersisted();
  const canEditDataView = true;

  const { dataView } = useDataView(props.scope);

  const dataViewId = dataView?.id;

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (newDataView) => {
        dispatch(shared.actions.addDataView(newDataView));
        dispatch(selectDataViewAsync({ id: newDataView.id, scope: [props.scope] }));
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
      dispatch(selectDataViewAsync({ id, scope: [props.scope] }));
    },
    [dispatch, props.scope]
  );

  const handleEditDataView = useCallback(() => {}, []);

  const triggerConfig = useMemo(() => {
    if (dataView.id === DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID) {
      return {
        label: 'Default Security Data View',
      };
    }

    return {
      label: dataView?.name || dataView?.id || 'Data view',
    };
  }, [dataView]);

  const { adhocDataViews: adhocDataViewSpecs, dataViews } = useSelector(sharedStateSelector);

  const managedDataViews = useMemo(() => {
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
