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
import { EXPLORE_DATA_VIEW_PREFIX } from '../../../../common/constants';
import type { SourcererUrlState } from '../../../sourcerer/store/model';
import { useUpdateUrlParam } from '../../../common/utils/global_query_string';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { useKibana } from '../../../common/lib/kibana';
import { sharedStateSelector } from '../../redux/selectors';
import { sharedDataViewManagerSlice } from '../../redux/slices';
import { useSelectDataView } from '../../hooks/use_select_data_view';
import { DataViewManagerScopeName } from '../../constants';
import { useManagedDataViews } from '../../hooks/use_managed_data_views';
import { useSavedDataViews } from '../../hooks/use_saved_data_views';
import { DEFAULT_SECURITY_DATA_VIEW, LOADING } from './translations';
import { DATA_VIEW_PICKER_TEST_ID } from './constants';
import { useDataView } from '../../hooks/use_data_view';
import { browserFieldsManager } from '../../utils/security_browser_fields_manager';

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

  const canEditDataView = useMemo(
    () => Boolean(dataViewEditor?.userPermissions.editDataView()),
    [dataViewEditor]
  );

  const closeDataViewEditor = useRef<() => void | undefined>();
  const closeFieldEditor = useRef<() => void | undefined>();

  const { dataView, status } = useDataView(scope);

  const { adhocDataViews: adhocDataViewSpecs, defaultDataViewId } =
    useSelector(sharedStateSelector);
  const adhocDataViews = useMemo(() => {
    return adhocDataViewSpecs
      .filter((spec) => !spec.id?.startsWith(EXPLORE_DATA_VIEW_PREFIX))
      .map((spec) => new DataView({ spec, fieldFormats }));
  }, [adhocDataViewSpecs, fieldFormats]);

  const managedDataViews = useManagedDataViews();
  const savedDataViews = useSavedDataViews();

  const isDefaultSourcerer = scope === DataViewManagerScopeName.default;
  const updateUrlParam = useUpdateUrlParam<SourcererUrlState>(URL_PARAM_KEY.sourcerer);

  const dataViewId = dataView?.id;

  // NOTE: this function is called in response to user interaction with the picker,
  // hence - it is the only place where we should update the url param for the data view selection.
  const handleChangeDataView = useCallback(
    (id: string, indexPattern: string = '') => {
      browserFieldsManager.removeFromCache(scope);
      selectDataView({ id, scope });

      if (isDefaultSourcerer) {
        updateUrlParam({
          [DataViewManagerScopeName.default]: {
            id,
            // NOTE: Boolean filter for removing empty patterns
            selectedPatterns: indexPattern.split(',').filter(Boolean),
          },
        });
      }
    },
    [isDefaultSourcerer, scope, selectDataView, updateUrlParam]
  );

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (newDataView) => {
        if (!newDataView.id) {
          return;
        }

        dispatch(sharedDataViewManagerSlice.actions.addDataView(newDataView));
        handleChangeDataView(newDataView.id, newDataView.getIndexPattern());
      },
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, dispatch, handleChangeDataView]);

  const editField = useCallback(
    async (fieldName?: string, _uiAction: 'edit' | 'add' = 'edit') => {
      if (!dataViewId) {
        return;
      }

      const dataViewInstance = await data.dataViews.get(dataViewId);
      // Modifications to the fields do not trigger cache invalidation, but should as `fields` will be stale.
      data.dataViews.clearInstanceCache(dataViewId);
      browserFieldsManager.removeFromCache(scope);

      closeFieldEditor.current = await dataViewFieldEditor.openEditor({
        ctx: {
          dataView: dataViewInstance,
        },
        fieldName,
        onSave: async () => {
          if (!dataViewInstance.id) {
            return;
          }

          handleChangeDataView(dataViewInstance.id, dataViewInstance.getIndexPattern());
        },
      });
    },
    [dataViewId, data.dataViews, scope, dataViewFieldEditor, handleChangeDataView]
  );

  /**
   * Selects data view again. After changes are made to the data view, this results in cache invalidation and will force the reload everywhere.
   */
  const handleDataViewModified = useMemo(() => {
    if (!canEditDataView) {
      return undefined;
    }
    return (updatedDataView: DataView) => {
      if (!updatedDataView.id) {
        return;
      }
      handleChangeDataView(updatedDataView.id, updatedDataView.getIndexPattern());
    };
  }, [canEditDataView, handleChangeDataView]);

  const handleAddField = useMemo(
    () => (canEditDataView ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataView]
  );

  const triggerConfig = useMemo(() => {
    if (status === 'loading') {
      return { label: LOADING };
    }

    if (dataView?.id === defaultDataViewId) {
      return {
        label: DEFAULT_SECURITY_DATA_VIEW,
      };
    }

    return {
      label: dataView?.name || dataView?.id || 'Data view',
    };
  }, [dataView?.id, dataView?.name, defaultDataViewId, status]);

  return (
    <div data-test-subj={DATA_VIEW_PICKER_TEST_ID}>
      <UnifiedDataViewPicker
        isDisabled={status !== 'ready' || disabled}
        currentDataViewId={dataViewId || (defaultDataViewId ?? undefined)}
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
