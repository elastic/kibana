/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type { EuiDataGridColumn } from '@elastic/eui';
import { noop } from 'lodash';
import { useFieldBrowserOptions } from '../../../timelines/components/fields_browser';
import type { SourcererScopeName } from '../../../sourcerer/store/model';

export const useAlertsTableFieldsBrowserOptions = (
  scopeId: SourcererScopeName,
  toggleColumn: (columnId: string) => void = noop
) => {
  const upsertColumn = useCallback(
    (column: EuiDataGridColumn) => {
      toggleColumn?.(column.id);
    },
    [toggleColumn]
  );
  const fieldBrowserArgs = useMemo(() => {
    return {
      sourcererScope: scopeId,
      removeColumn: toggleColumn,
      upsertColumn,
    };
  }, [scopeId, toggleColumn, upsertColumn]);
  const options = useFieldBrowserOptions(fieldBrowserArgs);

  return useMemo(() => {
    return {
      createFieldButton: options.createFieldButton,
    };
  }, [options.createFieldButton]);
};
