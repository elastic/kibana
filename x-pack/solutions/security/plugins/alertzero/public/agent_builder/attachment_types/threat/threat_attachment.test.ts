/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { createThreatAttachmentDefinition } from './threat_attachment';
import type { ThreatAttachment } from './types';
import { createMockNavigation } from '../test_utils';

describe('createThreatAttachmentDefinition', () => {
  const http = {} as HttpStart;
  const navigation = createMockNavigation();

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
    // No action buttons at all: the inline content already renders the full live
    // document, and a Discover exit against the hidden reports index would 403 for
    // a non-superuser anyway. See elastic/security-team#19733.
    expect(definition.getActionButtons).toBeUndefined();
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
});
