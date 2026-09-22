/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { createThreatAttachmentDefinition } from './threat_attachment';
import type { ThreatAttachment } from './types';
import { buildThreatReportLookupEsql } from '../navigation';
import { createMockShare, createMockNavigation } from '../test_utils';

describe('createThreatAttachmentDefinition', () => {
  const http = {} as HttpStart;
  const navigation = createMockNavigation();
  const withShare = { ...navigation, share: createMockShare() };

  it('renders the default shape for a minimal attachment', () => {
    const definition = createThreatAttachmentDefinition({ http, navigation });
    const attachment = { data: { report_id: 'r-1' } } as ThreatAttachment;

    expect(definition.getLabel(attachment)).toBe('Threat Report');
    expect(definition.getIcon?.()).toBe('document');
    expect(definition.getHeader?.({ attachment } as never)).toEqual({
      icon: 'document',
      subtitle: 'r-1',
    });
    expect(definition.renderInlineContent).toBeDefined();
    expect(definition.getActionButtons?.({ attachment } as never)).toEqual([]);
  });

  it('overrides the label and builds a name-then-id subtitle without header badges', () => {
    const definition = createThreatAttachmentDefinition({ http, navigation });
    const attachment = {
      data: {
        report_id: 'r-1',
        attachmentLabel: 'Custom label',
        source: 'Feed A',
        severity: 'high' as const,
      },
    } as ThreatAttachment;

    expect(definition.getLabel(attachment)).toBe('Custom label');
    expect(definition.getHeader?.({ attachment } as never)).toEqual({
      icon: 'document',
      subtitle: 'Feed A · r-1',
    });
  });

  it('ignores wrong-typed chrome fields rather than handing them to Agent Builder', () => {
    // The platform requires a string from getLabel, and this chrome renders outside the
    // inline renderer's control, so a persisted payload carrying an object cannot be
    // narrowed downstream the way the card body's fields are.
    const definition = createThreatAttachmentDefinition({ http, navigation });
    const attachment = {
      data: {
        report_id: 'r-1',
        attachmentLabel: { bad: 'object' },
        title: { bad: 'object' },
        source: 42,
      },
    } as unknown as ThreatAttachment;

    expect(definition.getLabel(attachment)).toBe('Threat Report');
    expect(definition.getHeader?.({ attachment } as never)).toEqual({
      icon: 'document',
      subtitle: 'r-1',
    });
  });

  it('falls back to the captured title when the label is unusable', () => {
    const definition = createThreatAttachmentDefinition({ http, navigation });
    const attachment = {
      data: { report_id: 'r-1', attachmentLabel: { bad: 'object' }, title: 'Usable title' },
    } as unknown as ThreatAttachment;

    expect(definition.getLabel(attachment)).toBe('Usable title');
  });

  it('returns Open report in Discover when share is available and report_id is set', () => {
    const definition = createThreatAttachmentDefinition({ http, navigation: withShare });
    const reportId = 'r-action';
    const attachment = { data: { report_id: reportId } } as ThreatAttachment;
    const expectedEsql = buildThreatReportLookupEsql({ reportId, spaceId: 'default' });

    expect(definition.getActionButtons?.({ attachment } as never)).toEqual([
      expect.objectContaining({
        label: 'Open report in Discover',
        icon: 'discoverApp',
        type: ActionButtonType.SECONDARY,
        openInNewTab: true,
        href: `https://example.test/discover?esql=${encodeURIComponent(expectedEsql)}`,
      }),
    ]);
  });

  it('returns no action buttons without share or without report_id', () => {
    const definition = createThreatAttachmentDefinition({ http, navigation });
    const withReportId = { data: { report_id: 'r-1' } } as ThreatAttachment;
    expect(definition.getActionButtons?.({ attachment: withReportId } as never)).toEqual([]);

    const withoutReportId = { data: {} } as ThreatAttachment;
    const definitionWithShare = createThreatAttachmentDefinition({ http, navigation: withShare });
    expect(
      definitionWithShare.getActionButtons?.({ attachment: withoutReportId } as never)
    ).toEqual([]);
  });
});
