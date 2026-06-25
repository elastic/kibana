/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

export type GraphInteractionTool = 'select' | 'pan';

export type PanelToggleHandler = () => void;
export type FocusSearchInputHandler = () => void;

export interface GraphInteractionToolContextValue {
  interactionTool: GraphInteractionTool;
  setInteractionTool: (tool: GraphInteractionTool) => void;
  registerApplyFiltersToggle: (toggle: PanelToggleHandler | null) => void;
  registerSearchPanelToggle: (toggle: PanelToggleHandler | null) => void;
  registerFocusSearchInput: (focus: FocusSearchInputHandler | null) => void;
}

export const GraphInteractionToolContext = createContext<GraphInteractionToolContextValue | null>(
  null
);

export const useGraphInteractionTool = (): GraphInteractionToolContextValue => {
  const context = useContext(GraphInteractionToolContext);

  if (!context) {
    throw new Error('useGraphInteractionTool must be used within GraphInteractionToolProvider');
  }

  return context;
};
