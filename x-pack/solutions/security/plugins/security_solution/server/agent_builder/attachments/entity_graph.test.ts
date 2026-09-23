/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_GET_ENTITY_GRAPH_TOOL_ID } from '../tools';
import { createEntityGraphAttachmentType } from './entity_graph';

describe('createEntityGraphAttachmentType', () => {
  const attachmentType = createEntityGraphAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  const validData = {
    identifierType: 'host' as const,
    identifier: 'server1',
    entityStoreId: 'host:server1',
    timeRange: { from: 'now-30d', to: 'now' },
  };

  it('has the entity_graph type id', () => {
    expect(attachmentType.id).toBe(SecurityAgentBuilderAttachments.entityGraph);
  });

  describe('validate', () => {
    it('accepts a well-formed graph preview payload', async () => {
      const result = await attachmentType.validate({ ...validData, attachmentLabel: 'Graph' });
      expect(result.valid).toBe(true);
    });

    it('rejects a payload missing the canonical entity id', async () => {
      const result = await attachmentType.validate({
        identifierType: 'host',
        identifier: 'server1',
        timeRange: { from: 'now-30d', to: 'now' },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects a payload missing the time range', async () => {
      const result = await attachmentType.validate({
        identifierType: 'host',
        identifier: 'server1',
        entityStoreId: 'host:server1',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects an unknown identifier type', async () => {
      const result = await attachmentType.validate({ ...validData, identifierType: 'widget' });
      expect(result.valid).toBe(false);
    });
  });

  describe('getTools', () => {
    it('associates the get_entity_graph tool', () => {
      expect(attachmentType.getTools?.()).toEqual([SECURITY_GET_ENTITY_GRAPH_TOOL_ID]);
    });
  });

  describe('format', () => {
    it('produces a text representation with the entity and time window', async () => {
      const attachment: Attachment<SecurityAgentBuilderAttachments.entityGraph, typeof validData> =
        {
          id: 'security.graph:host:abc',
          type: SecurityAgentBuilderAttachments.entityGraph,
          data: validData,
        };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = await formatted.getRepresentation?.();

      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(representation.value).toContain('host:server1');
        expect(representation.value).toContain('now-30d');
      }
    });
  });

  describe('getAgentDescription', () => {
    it('documents the render_attachment contract', () => {
      const description = attachmentType.getAgentDescription?.();
      expect(description).toContain('renderTag');
      expect(description).toContain('Open full graph');
    });
  });
});
