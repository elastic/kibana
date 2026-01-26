/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { EsqlWaffleNode, LegendConfig, WaffleBounds } from '../../types';
import type { WaffleNodeShape } from './waffle_node';

export type FilterAction = 'include' | 'exclude';

interface WaffleContextValue {
  /** Legend configuration for colors */
  legendConfig: LegendConfig;
  /** Bounds for color calculation */
  bounds: WaffleBounds;
  /** Size of nodes in pixels */
  nodeSize: number;
  /** Shape of nodes */
  shape: WaffleNodeShape;
  /** Spacing between nodes (EUI xs) */
  spacing: number;
  /** Click handler for nodes */
  onNodeClick?: (node: EsqlWaffleNode) => void;
  /** Fields used for grouping */
  groupByFields: string[];
  /** Filter handler for group values */
  onFilter?: (field: string, value: string, action: FilterAction) => void;
}

const WaffleContext = createContext<WaffleContextValue | null>(null);

interface WaffleProviderProps {
  children: React.ReactNode;
  legendConfig: LegendConfig;
  bounds: WaffleBounds;
  nodeSize: number;
  shape: WaffleNodeShape;
  onNodeClick?: (node: EsqlWaffleNode) => void;
  groupByFields: string[];
  onFilter?: (field: string, value: string, action: FilterAction) => void;
}

/**
 * Provider for waffle map shared context.
 * Eliminates prop drilling for common values.
 */
export const WaffleProvider: React.FC<WaffleProviderProps> = ({
  children,
  legendConfig,
  bounds,
  nodeSize,
  shape,
  onNodeClick,
  groupByFields,
  onFilter,
}) => {
  const { euiTheme } = useEuiTheme();
  const spacing = parseInt(euiTheme.size.xs, 10) || 4;

  const value = useMemo<WaffleContextValue>(
    () => ({
      legendConfig,
      bounds,
      nodeSize,
      shape,
      spacing,
      onNodeClick,
      groupByFields,
      onFilter,
    }),
    [legendConfig, bounds, nodeSize, shape, spacing, onNodeClick, groupByFields, onFilter]
  );

  return <WaffleContext.Provider value={value}>{children}</WaffleContext.Provider>;
};

/**
 * Hook to access waffle context.
 * Must be used within a WaffleProvider.
 */
export const useWaffleContext = (): WaffleContextValue => {
  const context = useContext(WaffleContext);
  if (!context) {
    throw new Error('useWaffleContext must be used within a WaffleProvider');
  }
  return context;
};
