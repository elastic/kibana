/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { createThreatAttachmentDefinition } from './threat_attachment';
import type { ThreatAttachment } from './types';
import { buildThreatReportLookupEsql } from '../navigation';

describe('createThreatAttachmentDefinition', () => {
  const http = {} as HttpStart;
  const navigation = { spaceId: 'default', prependPath: (path: string) => path };

  const mockShare = {
    url: {
      locators: {
        get: () => ({
          getRedirectUrl: ({ query }: { query: { esql: string } }) =>
            `https://example.test/discover?esql=${encodeURIComponent(query.esql)}`,
        }),
      },
    },
  } as unknown as SharePluginStart;

  describe('getLabel', () => {
    it('returns the default label when no attachmentLabel is set', () => {
      const definition = createThreatAttachmentDefinition({ http, navigation });
      const attachment = { data: { report_id: 'r-1' } } as ThreatAttachment;
      expect(definition.getLabel(attachment)).toBe('Threat Report');
    });

    it('returns the attachmentLabel override when present', () => {
      const definition = createThreatAttachmentDefinition({ http, navigation });
      const attachment = {
        data: { report_id: 'r-1', attachmentLabel: 'Custom label' },
      } as ThreatAttachment;
      expect(definition.getLabel(attachment)).toBe('Custom label');
    });
  });

  describe('getIcon', () => {
    it('returns the warning icon', () => {
      const definition = createThreatAttachmentDefinition({ http, navigation });
      expect(definition.getIcon?.()).toBe('warning');
    });
  });

  describe('renderInlineContent', () => {
    it('is defined', () => {
      const definition = createThreatAttachmentDefinition({ http, navigation });
      expect(definition.renderInlineContent).toBeDefined();
    });
  });

  describe('getActionButtons', () => {
    it('returns Open report in Discover when share is available', () => {
      const definition = createThreatAttachmentDefinition({
        http,
        navigation: { ...navigation, share: mockShare },
      });
      const reportId = 'r-action';
      const attachment = { data: { report_id: reportId } } as ThreatAttachment;
      const expectedEsql = buildThreatReportLookupEsql({ reportId });

      const buttons = definition.getActionButtons?.({ attachment } as never) ?? [];

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Open report in Discover');
      expect(buttons[0].icon).toBe('discoverApp');
      expect(buttons[0].type).toBe(ActionButtonType.SECONDARY);
      expect(buttons[0].openInNewTab).toBe(true);
      expect(buttons[0].href).toBe(
        `https://example.test/discover?esql=${encodeURIComponent(expectedEsql)}`
      );
    });

    it('returns no buttons when share is undefined', () => {
      const definition = createThreatAttachmentDefinition({ http, navigation });
      const attachment = { data: { report_id: 'r-1' } } as ThreatAttachment;

      expect(definition.getActionButtons?.({ attachment } as never)).toEqual([]);
    });

    it('returns no buttons when report_id is missing', () => {
      const definition = createThreatAttachmentDefinition({
        http,
        navigation: { ...navigation, share: mockShare },
      });
      const attachment = { data: {} } as ThreatAttachment;

      expect(definition.getActionButtons?.({ attachment } as never)).toEqual([]);
    });
  });
});
