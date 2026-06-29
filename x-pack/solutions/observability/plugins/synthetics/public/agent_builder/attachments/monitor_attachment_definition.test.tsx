/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  createMonitorAttachmentDefinition,
  MONITOR_ATTACHMENT_TYPE,
  type MonitorAttachment,
} from './monitor_attachment_definition';

const createAttachment = (overrides: { origin?: string } = {}): MonitorAttachment =>
  ({
    id: 'att-1',
    type: MONITOR_ATTACHMENT_TYPE,
    versions: [],
    current_version: 1,
    origin: overrides.origin,
    data: {
      type: 'http',
      urls: 'https://www.elastic.co',
      schedule: { number: '5', unit: 'm' },
      locations: [{ id: 'us_central', isServiceManaged: true }],
      metadata: { name: 'Elastic uptime' },
    },
  } as unknown as MonitorAttachment);

describe('createMonitorAttachmentDefinition', () => {
  it('exposes the stable attachment type id', () => {
    expect(MONITOR_ATTACHMENT_TYPE).toBe('observability.synthetics.monitor');
  });

  describe('getLabel', () => {
    it('returns the monitor name from metadata', () => {
      const definition = createMonitorAttachmentDefinition();
      expect(definition.getLabel(createAttachment())).toBe('Elastic uptime');
    });
  });

  describe('getIcon', () => {
    it('returns globe (representing HTTP URL checks)', () => {
      const definition = createMonitorAttachmentDefinition();
      expect(definition.getIcon!()).toBe('globe');
    });
  });

  describe('renderInlineContent', () => {
    it('renders the inline content with the URL visible', () => {
      const definition = createMonitorAttachmentDefinition();
      const { getByText } = render(
        <>{definition.renderInlineContent!({ attachment: createAttachment(), isSidebar: false })}</>
      );
      expect(getByText('https://www.elastic.co')).toBeDefined();
    });

    it('shows draft status when origin is unset', () => {
      const definition = createMonitorAttachmentDefinition();
      const { getByText } = render(
        <>{definition.renderInlineContent!({ attachment: createAttachment(), isSidebar: false })}</>
      );
      expect(getByText('draft')).toBeDefined();
    });

    it('shows saved status when origin is set', () => {
      const definition = createMonitorAttachmentDefinition();
      const { getByText } = render(
        <>
          {definition.renderInlineContent!({
            attachment: createAttachment({ origin: 'config-123' }),
            isSidebar: false,
          })}
        </>
      );
      expect(getByText('saved')).toBeDefined();
    });
  });

  describe('flyout / canvas extension points', () => {
    it('does not register a canvas content renderer (inline-only MVP)', () => {
      const definition = createMonitorAttachmentDefinition();
      expect(definition.renderCanvasContent).toBeUndefined();
    });

    it('does not register inline action buttons yet', () => {
      const definition = createMonitorAttachmentDefinition();
      expect(definition.getActionButtons).toBeUndefined();
    });
  });
});
