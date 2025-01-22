/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { EuiDataGridColumn } from '@elastic/eui';
import { useFieldBrowserOptions } from '../../../timelines/components/fields_browser';
import type { SourcererScopeName } from '../../../sourcerer/store/model';

export const getUseTriggersActionsFieldBrowserOptions = (scopeId: SourcererScopeName) => {
  const useTriggersActionsFieldBrowserOptions: AlertsTableConfigurationRegistry['useFieldBrowserOptions'] =
    ({ onToggleColumn }) => {
      const upsertColumn = useCallback(
        (column: EuiDataGridColumn) => {
          onToggleColumn(column.id);
        },
        [onToggleColumn]
      );
      const fieldBrowserArgs = useMemo(() => {
        return {
          sourcererScope: scopeId,
          removeColumn: onToggleColumn,
          upsertColumn,
        };
      }, [upsertColumn, onToggleColumn]);
      const options = useFieldBrowserOptions(fieldBrowserArgs);

      return useMemo(() => {
        return {
          createFieldButton: options.createFieldButton,
        };
      }, [options.createFieldButton]);
    };

  return useTriggersActionsFieldBrowserOptions;
};
