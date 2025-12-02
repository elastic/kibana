/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/onechat-common/attachments';
import { platformCoreTools } from '@kbn/onechat-common';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { createQueryHelpAttachmentType } from './query_help';

describe('createQueryHelpAttachmentType', () => {
  const attachmentType = createQueryHelpAttachmentType();

  describe('validate', () => {
    it('returns valid when query help data is valid', async () => {
      const input = { query: 'SELECT * FROM test', queryLanguage: 'esql' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns invalid when query field is missing', async () => {
      const input = { queryLanguage: 'esql' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when queryLanguage field is missing', async () => {
      const input = { query: 'SELECT * FROM test' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when query is not a string', async () => {
      const input = { query: 123, queryLanguage: 'esql' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('format', () => {
    it('includes query and queryLanguage in formatted output', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SecurityAgentBuilderAttachments.query_help,
        data: { query: 'SELECT * FROM test', queryLanguage: 'esql' },
      };

      const formatted = await attachmentType.format(attachment);
      const representation = await formatted.getRepresentation();

      expect(representation.type).toBe('text');
      expect(representation.value).toContain('Query: SELECT * FROM test');
      expect(representation.value).toContain('Query Language: esql');
    });

    it('throws error when attachment data is invalid', () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SecurityAgentBuilderAttachments.query_help,
        data: { invalid: 'data' },
      };

      expect(() => attachmentType.format(attachment)).toThrow(
        'Invalid query help attachment data for attachment test-id'
      );
    });
  });

  describe('getTools', () => {
    it('returns expected tools', () => {
      const tools = attachmentType.getTools?.();

      expect(tools).toBeDefined();
      if (tools) {
        expect(tools).toContain(platformCoreTools.generateEsql);
        expect(tools).toContain('platformCoreTools.productDocumentation');
      }
    });
  });

  describe('getAgentDescription', () => {
    it('returns expected description', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('broken query');
      expect(description).toContain('QUERY HELP DATA');
      expect(description).toContain('queryLanguage');
      expect(description).toContain('generateEsql');
    });
  });
});

