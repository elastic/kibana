/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionFactory, CellAction } from '@kbn/cell-actions';
import { isInSecurityApp } from '../../utils';
import type { SecurityAppStore } from '../../../../common/store';
import type { StartServices } from '../../../../types';
import { createFilterOutCellActionFactory } from '../cell_action/filter_out';

export const createFilterOutDiscoverCellActionFactory = ({
  store,
  services,
}: {
  store: SecurityAppStore;
  services: StartServices;
}): CellActionFactory<CellAction> => {
  const { application } = services;

  let currentAppId: string | undefined;
  application.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  const genericFilterOutActionFactory = createFilterOutCellActionFactory({ store, services });

  return genericFilterOutActionFactory.combine<CellAction>({
    isCompatible: async () => isInSecurityApp(currentAppId),
  });
};
