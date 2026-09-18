/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHuntCorrelationAttachmentDefinition } from './hunt_correlation_attachment';
import type { HuntCorrelationAttachment } from './types';

describe('createHuntCorrelationAttachmentDefinition', () => {
  const navigation = { spaceId: 'default', prependPath: (path: string) => path };

  describe('getLabel', () => {
    it('returns the default label when no attachmentLabel is set', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = { data: { anchors: [] } } as unknown as HuntCorrelationAttachment;
      expect(definition.getLabel(attachment)).toBe('Hunt Correlation');
    });

    it('returns the attachmentLabel override when present', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = {
        data: { anchors: [], attachmentLabel: 'Custom label' },
      } as unknown as HuntCorrelationAttachment;
      expect(definition.getLabel(attachment)).toBe('Custom label');
    });
  });

  describe('getIcon', () => {
    it('returns the link icon', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      expect(definition.getIcon?.()).toBe('link');
    });
  });

  describe('renderInlineContent', () => {
    it('is defined', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      expect(definition.renderInlineContent).toBeDefined();
    });
  });
});
