/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentDetailsTelemetryEvent } from './types';
import { DocumentEventTypes } from './types';

export const DocumentDetailsFlyoutOpenedEvent: DocumentDetailsTelemetryEvent = {
  eventType: DocumentEventTypes.DetailsFlyoutOpened,
  schema: {
    location: {
      type: 'text',
      _meta: {
        description: 'Table ID',
        optional: false,
      },
    },
    panel: {
      type: 'keyword',
      _meta: {
        description: 'Panel (left|right|preview)',
        optional: false,
      },
    },
  },
};

export const DocumentDetailsTabClickedEvent: DocumentDetailsTelemetryEvent = {
  eventType: DocumentEventTypes.DetailsFlyoutTabClicked,
  schema: {
    location: {
      type: 'text',
      _meta: {
        description: 'Table ID',
        optional: false,
      },
    },
    panel: {
      type: 'keyword',
      _meta: {
        description: 'Panel (left|right)',
        optional: false,
      },
    },
    tabId: {
      type: 'keyword',
      _meta: {
        description: 'Tab ID',
        optional: false,
      },
    },
  },
};

export const documentTelemetryEvents = [
  DocumentDetailsFlyoutOpenedEvent,
  DocumentDetailsTabClickedEvent,
];
