/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { SandboxCallContext } from './tool_utils';
import { authorizeConnector } from './connector_authorization';

describe('authorizeConnector', () => {
  it.each([
    { assignment: 'mixed sandbox support', allowedConnectorIds: ['github-1', 'jira-1'] },
    { assignment: 'no connectors', allowedConnectorIds: [] },
  ])(
    'points to the manifest without advertising assigned connectors with $assignment',
    async ({ allowedConnectorIds }) => {
      const actions = actionsMock.createStart();
      const callContext: SandboxCallContext = {
        request: httpServerMock.createKibanaRequest(),
        allowedConnectorIds,
        resolvedCredentials: new Map(),
      };

      const result = await authorizeConnector('other-connector', callContext, actions);

      expect(result).toEqual({
        errorMessage:
          "Connector 'other-connector' is not assigned to this agent. " +
          'Check /workspace/connectors.md for available connectors.',
      });
      expect(actions.getActionsClientWithRequest).not.toHaveBeenCalled();
      expect(actions.getActionsAuthorizationWithRequest).not.toHaveBeenCalled();
    }
  );
});
