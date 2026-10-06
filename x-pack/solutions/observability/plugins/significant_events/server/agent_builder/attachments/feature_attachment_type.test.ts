/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { encodeFeatureAttachmentOrigin } from '../../../common';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../routes/types';
import {
  createSignificantEventsServer,
  type NightshiftFeaturePrivilege,
} from '../utils/test_helpers';
import { createSignificantEventFeatureAttachmentType } from './feature_attachment_type';

const feature = { id: 'feature-1', stream_name: 'logs.test', type: 'entity' };

const setup = ({ featurePrivilege }: { featurePrivilege: NightshiftFeaturePrivilege }) => {
  const getFeature = jest.fn().mockResolvedValue(feature);
  const getScopedClients = jest.fn().mockResolvedValue({
    getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeature }),
  } as unknown as RouteHandlerScopedClients) as jest.MockedFunction<GetScopedClients>;
  const type = createSignificantEventFeatureAttachmentType({
    logger: loggingSystemMock.createLogger(),
    getScopedClients,
    server: createSignificantEventsServer({ featurePrivilege }),
  });
  return { type, getFeature };
};

describe('createSignificantEventFeatureAttachmentType', () => {
  const origin = encodeFeatureAttachmentOrigin('logs.test', 'feature-1');

  it('resolves a feature for a Nightshift reader', async () => {
    const { type, getFeature } = setup({ featurePrivilege: 'read' });

    await expect(
      type.resolve?.(origin, agentBuilderMocks.attachments.createResolveContextMock())
    ).resolves.toEqual(feature);
    expect(getFeature).toHaveBeenCalledWith('logs.test', 'feature-1');
  });

  it('does not resolve a feature without the Nightshift read privilege', async () => {
    const { type, getFeature } = setup({ featurePrivilege: 'none' });

    await expect(
      type.resolve?.(origin, agentBuilderMocks.attachments.createResolveContextMock())
    ).resolves.toBeUndefined();
    expect(getFeature).not.toHaveBeenCalled();
  });
});
