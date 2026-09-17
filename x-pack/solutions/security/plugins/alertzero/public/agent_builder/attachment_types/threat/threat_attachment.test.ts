/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { createThreatAttachmentDefinition } from './threat_attachment';
import type { ThreatAttachment } from './types';

describe('createThreatAttachmentDefinition', () => {
  const http = {} as HttpStart;

  describe('getLabel', () => {
    it('returns the default label when no attachmentLabel is set', () => {
      const definition = createThreatAttachmentDefinition({ http });
      const attachment = { data: { report_id: 'r-1' } } as ThreatAttachment;
      expect(definition.getLabel(attachment)).toBe('Threat Report');
    });

    it('returns the attachmentLabel override when present', () => {
      const definition = createThreatAttachmentDefinition({ http });
      const attachment = {
        data: { report_id: 'r-1', attachmentLabel: 'Custom label' },
      } as ThreatAttachment;
      expect(definition.getLabel(attachment)).toBe('Custom label');
    });
  });

  describe('getIcon', () => {
    it('returns the warning icon', () => {
      const definition = createThreatAttachmentDefinition({ http });
      expect(definition.getIcon?.()).toBe('warning');
    });
  });

  describe('renderInlineContent', () => {
    it('is defined', () => {
      const definition = createThreatAttachmentDefinition({ http });
      expect(definition.renderInlineContent).toBeDefined();
    });
  });
});
