/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { SecurityCellActions, CellActionsMode } from '../cell_actions';

interface Props {
  entityName: string;
  entityValue: string;
}

export const EntityComponent: React.FC<Props> = ({ entityName, entityValue }) => {
  return (
    <SecurityCellActions
      data={{
        field: entityName,
        value: entityValue,
      }}
      triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
      mode={CellActionsMode.HOVER_DOWN}
      visibleCellActions={5}
    >
      {`${entityName}: "${entityValue}"`}
    </SecurityCellActions>
  );
};

EntityComponent.displayName = 'EntityComponent';

export const Entity = React.memo(EntityComponent);

Entity.displayName = 'Entity';
