/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValidationError } from '@elastic/isomer-sdk';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentFormatContext,
  AttachmentTypeDefinition,
  SurfaceComposition,
  TextAttachmentRepresentation,
} from '@kbn/agent-builder-server/attachments';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';

/**
 * Formats `data` through `attachmentType` and returns the plain text
 * representation. Shared by the server-side attachment tests that only
 * assert on the rendered text.
 */
export const formatToText = async (
  attachmentType: AttachmentTypeDefinition,
  formatContext: AttachmentFormatContext,
  data: unknown,
  id = 'test-id'
): Promise<string> => {
  const attachment: Attachment<string, unknown> = { id, type: attachmentType.id, data };
  const formatted = await attachmentType.format(attachment, formatContext);
  const representation = formatted.getRepresentation
    ? await formatted.getRepresentation()
    : { type: 'text', value: '' };

  return (representation as TextAttachmentRepresentation).value;
};

export const surfaceContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
  agentId: 'hunt-agent',
};

/**
 * Validates a surface composition with the `isomer` plugin's runtime, as Agent Builder does before
 * it renders one, and renders it for Slack.
 */
export const renderSurface = async (composition: SurfaceComposition | undefined) => {
  if (!composition) {
    throw new Error('Expected a surface composition');
  }

  const runtime = await isomerPluginMock.createStartContract().getRuntime();
  const { valid, errors } = runtime.validate(composition);

  return {
    errors: errors.map(formatValidationError),
    valid,
    slack: JSON.stringify(
      runtime.surfaces.slack.render(composition, {
        heading: false,
        baseUrl: 'https://kibana.example.com',
      }).blocks
    ),
  };
};
