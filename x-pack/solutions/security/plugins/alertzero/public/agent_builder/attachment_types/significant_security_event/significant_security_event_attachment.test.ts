/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSignificantSecurityEventAttachmentDefinition } from './significant_security_event_attachment';
import type { SignificantSecurityEventAttachment } from './types';

describe('createSignificantSecurityEventAttachmentDefinition', () => {
  describe('getLabel', () => {
    it('returns the default label when no attachmentLabel is set', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition();
      const attachment = { data: { title: 'x' } } as SignificantSecurityEventAttachment;
      expect(definition.getLabel(attachment)).toBe('Significant Security Event');
    });

    it('returns the attachmentLabel override when present', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition();
      const attachment = {
        data: { title: 'x', attachmentLabel: 'Custom label' },
      } as SignificantSecurityEventAttachment;
      expect(definition.getLabel(attachment)).toBe('Custom label');
    });
  });

  describe('getIcon', () => {
    it('returns the flag icon', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition();
      expect(definition.getIcon?.()).toBe('flag');
    });
  });

  describe('renderInlineContent', () => {
    it('is defined', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition();
      expect(definition.renderInlineContent).toBeDefined();
    });
  });
});
