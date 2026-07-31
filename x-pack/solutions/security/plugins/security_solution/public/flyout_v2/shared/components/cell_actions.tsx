/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RefObject } from 'react';
import type { AlertsTableImperativeApi } from '@kbn/response-ops-alerts-table/types';
import {
  SECURITY_CELL_ACTIONS_CASE_EVENTS,
  SECURITY_CELL_ACTIONS_DEFAULT,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  type CellActionFieldValue,
  CellActionsMode,
  SecurityCellActions,
} from '../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../helpers';

export interface CellActionRendererProps {
  children: React.ReactNode;
  field: string;
  scopeId: string;
  value: CellActionFieldValue;
}

export type CellActionRenderer = (props: CellActionRendererProps) => React.ReactNode | null;

/**
 * No-op cell action renderer for callers that never want cell actions (e.g. Discover, EASE flyout).
 */
export const noopCellActionRenderer: CellActionRenderer = ({ children }) => <>{children}</>;

export interface CreateCellActionRendererOptions {
  /**
   * Trigger the cell actions are rendered against. Defaults to the slim `SECURITY_CELL_ACTIONS_DEFAULT`
   * trigger. The document details flyout (alerts table / Timeline) passes
   * `SECURITY_CELL_ACTIONS_DETAILS_FLYOUT` so that the "Toggle column in table" (and "Toggle user asset
   * field") actions — which are only registered on that trigger — are available on alert fields.
   */
  triggerId?: string;
  /**
   * Number of actions shown before the overflow menu. Defaults to `5` (the default trigger's action
   * count); the details-flyout trigger uses `6` to match the legacy flyout.
   */
  visibleCellActions?: number;
  /**
   * Handle to the currently visible alerts table, forwarded to the cell action metadata so the
   * "Toggle column in table" action can add/remove columns on the imperatively-controlled alerts table.
   */
  alertsTableRef?: RefObject<AlertsTableImperativeApi>;
}

/**
 * Creates a Security Solution cell action renderer bound to a specific scope.
 *
 * `boundScopeId` takes precedence over the per-render `scopeId` when non-empty. This lets callers
 * that know the scope up front (e.g. Timeline, which opens the flyout from `timeline-1`) ensure every
 * cell action inside the flyout reports the correct scope, so Filter In/Out route to the Timeline's
 * own filter manager instead of the page's global one. When `boundScopeId` is empty, it falls back to
 * the per-render `scopeId`, preserving the default behavior.
 *
 * The document details flyout additionally passes a details-flyout `triggerId` (and, for the alerts
 * table, an `alertsTableRef`) so the column-toggle action is both available and functional.
 */
export const createCellActionRenderer = (
  boundScopeId: string,
  {
    triggerId = SECURITY_CELL_ACTIONS_DEFAULT,
    visibleCellActions = 5,
    alertsTableRef,
  }: CreateCellActionRendererOptions = {}
): CellActionRenderer => {
  const boundCellActionRenderer: CellActionRenderer = ({
    field,
    value,
    children,
    scopeId,
  }: CellActionRendererProps) => {
    const effectiveScopeId = boundScopeId || scopeId;
    return (
      <SecurityCellActions
        data={{
          field,
          value: value ?? [],
        }}
        triggerId={triggerId}
        mode={CellActionsMode.HOVER_DOWN}
        visibleCellActions={visibleCellActions}
        sourcererScopeId={getSourcererScopeId(effectiveScopeId)}
        metadata={{ scopeId: effectiveScopeId, alertsTableRef }}
      >
        {children}
      </SecurityCellActions>
    );
  };
  return boundCellActionRenderer;
};

/**
 * Default cell action renderer for Security Solution. This component is used to render cell actions for fields in Security Solution.
 * This is used in the expandable flyout and in the new flyout (though only when used in Security Solution).
 */
export const cellActionRenderer: CellActionRenderer = createCellActionRenderer('');

/**
 * Cell action renderer for Cases.
 * This is used in the expandable flyout and in the new flyout (though only when used in Security Solution).
 */
export const casesCellActionRenderer: CellActionRenderer = ({
  field,
  value,
  children,
  scopeId,
}: CellActionRendererProps) => (
  <SecurityCellActions
    data={{
      field,
      value: value ?? [],
    }}
    triggerId={SECURITY_CELL_ACTIONS_CASE_EVENTS}
    mode={CellActionsMode.HOVER_DOWN}
    visibleCellActions={2}
    sourcererScopeId={getSourcererScopeId(scopeId)}
    metadata={{ scopeId }}
  >
    {children}
  </SecurityCellActions>
);
