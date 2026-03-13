/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { ResolverCellActionRenderer } from '../../../resolver/types';
import { CellActionsMode, SecurityCellActions } from '../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../helpers';

/**
 * Default cell action renderer for Security Solution. This component is used to render cell actions for fields in Security Solution.
 * This is used in the expandable flyout and in the new flyout (though only when used in Security Solution).
 */
export const analyzerCellActionRenderer: ResolverCellActionRenderer = ({
  field,
  value,
  children,
  scopeId,
}) => (
  <SecurityCellActions
    data={{
      field,
      value: value ?? [],
    }}
    triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
    mode={CellActionsMode.HOVER_DOWN}
    visibleCellActions={5}
    sourcererScopeId={getSourcererScopeId(scopeId)}
    metadata={{ scopeId }}
  >
    {children}
  </SecurityCellActions>
);
