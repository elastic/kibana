/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type {
  CreateFieldComponent,
  GetFieldTableColumns,
} from '@kbn/response-ops-alerts-fields-browser/types';
import type { PageScope } from '../../../data_view_manager/constants';
import type { ColumnHeaderOptions } from '../../../../common/types';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useKibana } from '../../../common/lib/kibana';
import type { State } from '../../../common/store';
import { sourcererSelectors } from '../../../common/store';
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
  sourcererScope: PageScope;
  removeColumn: (columnId: string) => void;
  upsertColumn: (column: ColumnHeaderOptions, index: number) => void;
  editorActionsRef?: FieldEditorActionsRef;
}

export type UseFieldBrowserOptions = (props: UseFieldBrowserOptionsProps) => {
  createFieldButton: CreateFieldComponent | undefined;
  getFieldTableColumns: GetFieldTableColumns;
};

/**
 * This hook is used in the alerts table and explore page tables (StatefulEventsViewer) to manage field browser options.
 */
export const useFieldBrowserOptions: UseFieldBrowserOptions = ({
  sourcererScope,
  editorActionsRef,
  removeColumn,
  upsertColumn,
}) => {
  const [dv, setDv] = useState<DataView | null>(null);
  const { dataView } = useDataView(sourcererScope);

  const { startTransaction } = useStartTransaction();
  const {
    dataViewFieldEditor,
    data: { dataViews },
  } = useKibana().services;
  const missingPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeMissingPatterns(state, sourcererScope);
  });

  const selectedDataViewId = useMemo(() => dataView?.id, [dataView?.id]);
  useEffect(() => {
    if (dataView && selectedDataViewId != null && !missingPatterns.length) {
      setDv(dataView);
    }
  }, [selectedDataViewId, missingPatterns, dataViews, dataView]);

  const openFieldEditor = useCallback<OpenFieldEditor>(
    async (fieldName) => {
      if (dv && selectedDataViewId) {
        const closeFieldEditor = await dataViewFieldEditor.openEditor({
          ctx: { dataView: dv },
          fieldName,
          onSave: async (savedFields: DataViewField[]) => {
            startTransaction({ name: FIELD_BROWSER_ACTIONS.FIELD_SAVED });
            // Fetch the updated list of fields
            // Using cleanCache since the number of fields might have not changed, but we need to update the state anyway
            dataViews.clearInstanceCache(selectedDataViewId);

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
      dv,
      selectedDataViewId,
      dataViewFieldEditor,
      editorActionsRef,
      startTransaction,
      dataViews,
      upsertColumn,
      removeColumn,
    ]
  );

  const openDeleteFieldModal = useCallback<OpenDeleteFieldModal>(
    (fieldName: string) => {
      if (dv && selectedDataViewId) {
        dataViewFieldEditor.openDeleteModal({
          ctx: { dataView: dv },
          fieldName,
          onDelete: async () => {
            startTransaction({ name: FIELD_BROWSER_ACTIONS.FIELD_DELETED });
            dataViews.clearInstanceCache(selectedDataViewId);
            removeColumn(fieldName);
          },
        });
      }
    },
    [dv, selectedDataViewId, dataViewFieldEditor, startTransaction, removeColumn, dataViews]
  );

  const hasFieldEditPermission = useMemo(
    () => dataViewFieldEditor?.userPermissions.editIndexPattern(),
    [dataViewFieldEditor?.userPermissions]
  );

  const createFieldButton = useCreateFieldButton({
    isAllowed: hasFieldEditPermission && !!selectedDataViewId && !dv?.managed,
    loading: !dv,
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
