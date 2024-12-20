/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { useCallback } from 'react';
import { DataSourceSelectionChangeHandler } from '../../common/data_source_selection';
import { LogsExplorerControllerStateService } from '../state_machines/logs_explorer_controller';

export const useDataSourceSelection = (
  logsExplorerControllerStateService: LogsExplorerControllerStateService
) => {
  const dataSourceSelection = useSelector(logsExplorerControllerStateService, (state) => {
    return state.context.dataSourceSelection;
  });
  const allSelection = useSelector(logsExplorerControllerStateService, (state) => {
    return state.context.allSelection;
  });

  const handleDataSourceSelectionChange: DataSourceSelectionChangeHandler = useCallback(
    (data) => {
      logsExplorerControllerStateService.send({ type: 'UPDATE_DATA_SOURCE_SELECTION', data });
    },
    [logsExplorerControllerStateService]
  );

  return { dataSourceSelection, allSelection, handleDataSourceSelectionChange };
};
