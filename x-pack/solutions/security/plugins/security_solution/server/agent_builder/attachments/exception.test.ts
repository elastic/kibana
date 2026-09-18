/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { createExceptionAttachmentType } from './exception';
import type { ExceptionAttachmentData } from './exception';

describe('createExceptionAttachmentType', () => {
  const attachmentType = createExceptionAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  const validData: ExceptionAttachmentData = {
    name: 'Exclude maintenance host',
    description: 'Host is under maintenance',
    entries: [
      { field: 'host.name', operator: 'is', value: 'svc-01' },
      { field: 'user.name', operator: 'is_one_of', values: ['svc-patching', 'svc-backup'] },
    ],
  };

  const buildAttachment = (
    data: unknown
  ): Attachment<SecurityAgentBuilderAttachments.exception, unknown> => ({
    id: 'security.exception:proposal-1',
    type: SecurityAgentBuilderAttachments.exception,
    data,
  });

  it('has the exception type id', () => {
    expect(attachmentType.id).toBe(SecurityAgentBuilderAttachments.exception);
  });

  it('is read-only: an unaccepted proposal cannot be edited from chat', () => {
    expect(attachmentType.isReadonly).toBe(true);
  });

  it('has no by-reference mode, so adding it never creates an exception item', () => {
    expect(attachmentType.resolve).toBeUndefined();
  });

  describe('validate', () => {
    it('accepts the item shape the createRuleException step accepts', async () => {
      const result = await attachmentType.validate({ ...validData, attachmentLabel: 'Proposal' });
      expect(result.valid).toBe(true);
    });

    it('rejects a payload without entries', async () => {
      const result = await attachmentType.validate({
        name: validData.name,
        description: validData.description,
        entries: [],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects an entry whose operator is missing its operand', async () => {
      const result = await attachmentType.validate({
        ...validData,
        entries: [{ field: 'host.name', operator: 'is' }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects a value-list condition combined with a field condition', async () => {
      const result = await attachmentType.validate({
        ...validData,
        entries: [
          { field: 'host.name', operator: 'is', value: 'svc-01' },
          { field: 'user.name', operator: 'is_in_list', list: { id: 'users', type: 'keyword' } },
        ],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('renders the proposal as text with every condition', async () => {
      const formatted = await attachmentType.format(buildAttachment(validData), formatContext);
      const representation = await formatted.getRepresentation?.();

      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(representation.value).toContain('Exclude maintenance host');
        expect(representation.value).toContain('Host is under maintenance');
        expect(representation.value).toContain('- host.name is svc-01');
        expect(representation.value).toContain('- user.name is_one_of svc-patching, svc-backup');
      }
    });

    it('includes the optional item fields when present', async () => {
      const formatted = await attachmentType.format(
        buildAttachment({
          ...validData,
          os_types: ['windows'],
          tags: ['detection-watch'],
          expire_time: '2026-10-01T00:00:00.000Z',
        }),
        formatContext
      );
      const representation = await formatted.getRepresentation?.();

      if (representation?.type === 'text') {
        expect(representation.value).toContain('Operating systems: windows');
        expect(representation.value).toContain('Tags: detection-watch');
        expect(representation.value).toContain('Expires: 2026-10-01T00:00:00.000Z');
      }
    });

    it('throws on data that does not match the schema', async () => {
      expect(() =>
        attachmentType.format(buildAttachment({ name: 'No entries' }), formatContext)
      ).toThrow('Invalid exception attachment data for attachment security.exception:proposal-1');
    });
  });

  describe('getAgentDescription', () => {
    it('tells the agent the proposal is not applied and cannot be edited', () => {
      const description = attachmentType.getAgentDescription?.();
      expect(description).toContain('has not been created yet');
      expect(description).toContain('cannot be edited');
    });

    it('tells the agent to render the proposal inline when asked to show it', () => {
      expect(attachmentType.getAgentDescription?.()).toContain('Render it inline');
    });
  });
});
