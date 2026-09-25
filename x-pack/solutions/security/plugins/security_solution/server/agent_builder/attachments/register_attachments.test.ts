/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { allowedExperimentalValues } from '../../../common/experimental_features';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { registerAttachments } from './register_attachments';

const createMockAgentBuilder = () => {
  const registeredTypes: AttachmentTypeDefinition[] = [];
  return {
    mock: {
      attachments: {
        registerType: jest.fn((type: AttachmentTypeDefinition) => {
          registeredTypes.push(type);
        }),
      },
    } as unknown as AgentBuilderPluginSetup,
    registeredTypes,
  };
};

describe('registerAttachments', () => {
  it('registers the security.impact attachment type', async () => {
    const { mock, registeredTypes } = createMockAgentBuilder();
    const logger = loggingSystemMock.createLogger() as unknown as Logger;
    const core = {
      getStartServices: jest.fn(),
    } as unknown as SecuritySolutionPluginCoreSetupDependencies;

    await registerAttachments(mock, core, logger, { ...allowedExperimentalValues });

    expect(registeredTypes.map((type) => type.id)).toContain(
      SecurityAgentBuilderAttachments.impact
    );
  });
});
