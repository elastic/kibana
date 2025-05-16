/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import * as i18n from './translations';
import { MissingPrivilegesCallOut, MissingPrivilegesDescription } from '../missing_privileges';

const LEVEL_TRANSLATION = {
  read: i18n.REQUIRED_PRIVILEGES_CONNECTORS_READ,
  all: i18n.REQUIRED_PRIVILEGES_CONNECTORS_ALL,
};

export const ConnectorsMissingPrivilegesDescription = React.memo<{ level: 'read' | 'all' }>(
  ({ level }) => <MissingPrivilegesDescription privileges={[LEVEL_TRANSLATION[level]]} />
);
ConnectorsMissingPrivilegesDescription.displayName = 'ConnectorsMissingPrivilegesDescription';

export const ConnectorsMissingPrivilegesCallOut = React.memo<{ level: 'read' | 'all' }>(
  ({ level }) => (
    <MissingPrivilegesCallOut>
      <ConnectorsMissingPrivilegesDescription level={level} />
    </MissingPrivilegesCallOut>
  )
);
ConnectorsMissingPrivilegesCallOut.displayName = 'ConnectorsMissingPrivilegesCallOut';
