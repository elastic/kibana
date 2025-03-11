/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleDataAction, ConsoleStoreReducer } from '../types';

type SidePanelAction = ConsoleDataAction & {
  type: 'showSidePanel';
};

export const handleSidePanel: ConsoleStoreReducer<SidePanelAction> = (state, action) => {
  switch (action.type) {
    case 'showSidePanel':
      if (state.sidePanel.show !== action.payload.show) {
        return {
          ...state,
          sidePanel: {
            ...state.sidePanel,
            show: action.payload.show,
          },
        };
      }
      break;
  }

  return state;
};
