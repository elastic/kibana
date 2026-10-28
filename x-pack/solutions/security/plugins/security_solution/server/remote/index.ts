/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemoteModule } from '@kbn/core-remote-common';
import { AlertGraphEsToken, WorkflowStepKind } from './tokens';

export const remoteModule: RemoteModule = {
  providers: [
    {
      token: AlertGraphEsToken,
      placement: 'coordinator',
      modulePath: require.resolve('./alert_graph_es'),
      exportName: 'AlertGraphEs',
    },
  ],
  contributions: [
    {
      kind: WorkflowStepKind,
      stepType: 'security.buildAlertEntityGraph',
      modulePath: require.resolve('./alert_graph_step'),
      exportName: 'AlertGraphStep',
    },
  ],
};
