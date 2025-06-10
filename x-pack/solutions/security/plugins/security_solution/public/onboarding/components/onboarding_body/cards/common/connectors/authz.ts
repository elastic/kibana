/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { CapabilitiesChecker } from '../../../../../../common/lib/capabilities';

export interface ConnectorsAuthz {
  canReadConnectors: boolean;
  canExecuteConnectors: boolean;
  canCreateConnectors: boolean;
}

export const getConnectorsAuthz = (capabilities: Capabilities): ConnectorsAuthz => {
  const checker = new CapabilitiesChecker(capabilities);
  return {
    canReadConnectors: checker.has('actions.show'),
    canExecuteConnectors: checker.has([['actions.show', 'actions.execute']]),
    canCreateConnectors: checker.has('actions.save'),
  };
};
