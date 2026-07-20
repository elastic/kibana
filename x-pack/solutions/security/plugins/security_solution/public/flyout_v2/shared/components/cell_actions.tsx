/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

/**
 * Creates a default Security Solution cell action renderer bound to a specific scope.
 *
 * `boundScopeId` takes precedence over the per-render `scopeId` when non-empty. This lets callers
 * that know the scope up front (e.g. Timeline, which opens the flyout from `timeline-1`) ensure every
 * cell action inside the flyout reports the correct scope, so Filter In/Out route to the Timeline's
 * own filter manager instead of the page's global one. When `boundScopeId` is empty, it falls back to
 * the per-render `scopeId`, preserving the default behavior.
 */
export const createCellActionRenderer = (boundScopeId: string): CellActionRenderer => {
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
        triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
        mode={CellActionsMode.HOVER_DOWN}
        visibleCellActions={5}
        sourcererScopeId={getSourcererScopeId(effectiveScopeId)}
        metadata={{ scopeId: effectiveScopeId }}
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
