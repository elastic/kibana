/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { AttackRow } from './attack_tab_row';

/**
 * Passed via context rather than closed over, because `EuiDataGrid` treats cell render functions
 * as component types and rebuilding them would remount every cell.
 */
export interface AttackGridCellContextValue {
  areAllRowsSelected: boolean;
  canInvestigateInTimeline: boolean;
  investigateAttackInTimeline: (attack: AttackDiscoveryAlert | undefined) => void;
  /** Removes 1 attack from the case. Unset when the user can't remove. */
  onRemoveAttack?: (attackId: string) => void;
  rows: AttackRow[];
  /** Rows that resolved to a live document. */
  selectableRowCount: number;
  selectedRowCount: number;
  selectedRowIds: ReadonlySet<string>;
  toggleAllRowsSelected: () => void;
  toggleRowSelected: (savedObjectId: string) => void;
}

export const AttackGridCellContext = createContext<AttackGridCellContextValue | null>(null);

export const useAttackGridCellContext = (): AttackGridCellContextValue => {
  const cellContext = useContext(AttackGridCellContext);

  if (cellContext == null) {
    throw new Error('The attacks grid cells must be rendered inside AttackGridCellContext');
  }

  return cellContext;
};
