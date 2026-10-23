/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import { AddConnectorMenu } from '@kbn/agent-builder-plugin/public';
import { useAgentConnectors } from './use_agent_connectors';

export function InvestigationAgentAddConnectorMenu({
  fill = true,
  size,
}: {
  fill?: boolean;
  size?: EuiButtonProps['size'];
}): React.ReactElement | null {
  const { openLibrary, openCreate, flyouts, canEditAgent, hasConnectorsAllPrivileges } =
    useAgentConnectors();

  if (!hasConnectorsAllPrivileges || !canEditAgent) return null;

  return (
    <>
      <AddConnectorMenu
        onAddFromLibrary={openLibrary}
        onCreateNew={openCreate}
        buttonTestSubj="nightshiftAddConnectorButton"
        fill={fill}
        size={size}
      />
      {flyouts}
    </>
  );
}
