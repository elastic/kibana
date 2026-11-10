/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../routes/types';
import {
  createSignificantEventsServer,
  type NightshiftFeaturePrivilege,
} from '../utils/test_helpers';
import { createSignificantEventDetectionAttachmentType } from './detection_attachment_type';

const detection = {
  '@timestamp': '2026-01-01T00:00:00.000Z',
  detection_id: 'rule-1-exec-1',
  rule_uuid: 'rule-1',
  rule_name: 'Checkout errors',
  source_id: 'logs.test',
  change_point_type: 'spike',
};

const setup = ({ featurePrivilege }: { featurePrivilege: NightshiftFeaturePrivilege }) => {
  const findById = jest.fn().mockResolvedValue({ hits: [{ ...detection, processed: false }] });
  const getScopedClients = jest.fn().mockResolvedValue({
    getDetectionClient: jest.fn().mockResolvedValue({ findById }),
  } as unknown as RouteHandlerScopedClients) as jest.MockedFunction<GetScopedClients>;
  const type = createSignificantEventDetectionAttachmentType({
    logger: loggingSystemMock.createLogger(),
    getScopedClients,
    server: createSignificantEventsServer({ featurePrivilege }),
  });
  return { type, findById };
};

describe('createSignificantEventDetectionAttachmentType', () => {
  it('resolves a detection for a Nightshift reader', async () => {
    const { type, findById } = setup({ featurePrivilege: 'read' });

    await expect(
      type.resolve?.('rule-1-exec-1', agentBuilderMocks.attachments.createResolveContextMock())
    ).resolves.toEqual(detection);
    expect(findById).toHaveBeenCalledWith('rule-1-exec-1');
  });

  it('does not resolve a detection without the Nightshift read privilege', async () => {
    const { type, findById } = setup({ featurePrivilege: 'none' });

    await expect(
      type.resolve?.('rule-1-exec-1', agentBuilderMocks.attachments.createResolveContextMock())
    ).resolves.toBeUndefined();
    expect(findById).not.toHaveBeenCalled();
  });
});
