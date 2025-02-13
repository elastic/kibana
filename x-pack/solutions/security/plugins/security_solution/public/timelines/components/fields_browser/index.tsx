/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type {
  CreateFieldComponent,
  GetFieldTableColumns,
} from '@kbn/response-ops-alerts-fields-browser/types';
import type { ColumnHeaderOptions } from '../../../../common/types';
import { useDataView } from '../../../common/containers/source/use_data_view';
import { useKibana } from '../../../common/lib/kibana';
import { sourcererSelectors } from '../../../common/store';
import type { State } from '../../../common/store';
import type { SourcererScopeName } from '../../../sourcerer/store/model';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/constants';
import { useCreateFieldButton } from './create_field_button';
import { useFieldTableColumns } from './field_table_columns';
import { useStartTransaction } from '../../../common/lib/apm/use_start_transaction';
import { FIELD_BROWSER_ACTIONS } from '../../../common/lib/apm/user_actions';

export type FieldEditorActions = { closeEditor: () => void } | null;
export type FieldEditorActionsRef = MutableRefObject<FieldEditorActions>;

export type OpenFieldEditor = (fieldName?: string) => void;
export type OpenDeleteFieldModal = (fieldName: string) => void;

export interface UseFieldBrowserOptionsProps {
  sourcererScope: SourcererScopeName;
  removeColumn: (columnId: string) => void;
  upsertColumn: (column: ColumnHeaderOptions, index: number) => void;
  editorActionsRef?: FieldEditorActionsRef;
}

export type UseFieldBrowserOptions = (props: UseFieldBrowserOptionsProps) => {
  createFieldButton: CreateFieldComponent | undefined;
  getFieldTableColumns: GetFieldTableColumns;
};

export const useFieldBrowserOptions: UseFieldBrowserOptions = ({
  sourcererScope,
  editorActionsRef,
  removeColumn,
  upsertColumn,
}) => {
  const [dataView, setDataView] = useState<DataView | null>(null);

  const { startTransaction } = useStartTransaction();
  const { indexFieldsSearch } = useDataView();
  const {
    dataViewFieldEditor,
    data: { dataViews },
  } = useKibana().services;
  const missingPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeMissingPatterns(state, sourcererScope);
  });
  const selectedDataViewId = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedDataViewId(state, sourcererScope);
  });
  useEffect(() => {
    let ignore = false;
    const fetchAndSetDataView = async (dataViewId: string) => {
      const aDatView = await dataViews.get(dataViewId);
      if (ignore) return;
      setDataView(aDatView);
    };
    if (selectedDataViewId != null && !missingPatterns.length) {
      fetchAndSetDataView(selectedDataViewId);
    }

    return () => {
      ignore = true;
    };
  }, [selectedDataViewId, missingPatterns, dataViews]);

  const openFieldEditor = useCallback<OpenFieldEditor>(
    async (fieldName) => {
      if (dataView && selectedDataViewId) {
        const closeFieldEditor = await dataViewFieldEditor.openEditor({
          ctx: { dataView },
          fieldName,
          onSave: async (savedFields: DataViewField[]) => {
            startTransaction({ name: FIELD_BROWSER_ACTIONS.FIELD_SAVED });
            // Fetch the updated list of fields
            // Using cleanCache since the number of fields might have not changed, but we need to update the state anyway
            await indexFieldsSearch({ dataViewId: selectedDataViewId, cleanCache: true });

            for (const savedField of savedFields) {
              if (fieldName && fieldName !== savedField.name) {
                // Remove old field from event table when renaming a field
                removeColumn(fieldName);
              }

              // Add the saved column field to the table in any case

              upsertColumn(
                {
                  columnHeaderType: defaultColumnHeaderType,
                  id: savedField.name,
                  initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
                },
                0
              );
            }
            if (editorActionsRef) {
              editorActionsRef.current = null;
            }
          },
        });
        if (editorActionsRef) {
          editorActionsRef.current = {
            closeEditor: () => {
              editorActionsRef.current = null;
              closeFieldEditor();
            },
          };
        }
      }
    },
    [
      dataView,
      selectedDataViewId,
      dataViewFieldEditor,
      editorActionsRef,
      indexFieldsSearch,
      removeColumn,
      upsertColumn,
      startTransaction,
    ]
  );

  const openDeleteFieldModal = useCallback<OpenDeleteFieldModal>(
    (fieldName: string) => {
      if (dataView && selectedDataViewId) {
        dataViewFieldEditor.openDeleteModal({
          ctx: { dataView },
          fieldName,
          onDelete: async () => {
            startTransaction({ name: FIELD_BROWSER_ACTIONS.FIELD_DELETED });

            // Fetch the updated list of fields
            await indexFieldsSearch({ dataViewId: selectedDataViewId });

            removeColumn(fieldName);
          },
        });
      }
    },
    [
      dataView,
      selectedDataViewId,
      dataViewFieldEditor,
      indexFieldsSearch,
      removeColumn,
      startTransaction,
    ]
  );

  const hasFieldEditPermission = useMemo(
    () => dataViewFieldEditor?.userPermissions.editIndexPattern(),
    [dataViewFieldEditor?.userPermissions]
  );

  const createFieldButton = useCreateFieldButton({
    isAllowed: hasFieldEditPermission && !!selectedDataViewId,
    loading: !dataView,
    openFieldEditor,
  });

  const getFieldTableColumns = useFieldTableColumns({
    hasFieldEditPermission,
    openFieldEditor,
    openDeleteFieldModal,
  });

  const memoized = useMemo(
    () => ({
      createFieldButton,
      getFieldTableColumns,
    }),
    [createFieldButton, getFieldTableColumns]
  );
  return memoized;
};
