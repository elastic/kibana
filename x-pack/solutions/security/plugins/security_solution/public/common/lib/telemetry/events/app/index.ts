/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppTelemetryEvent } from './types';
import { AppEventTypes } from './types';

const cellActionClickedEvent: AppTelemetryEvent = {
  eventType: AppEventTypes.CellActionClicked,
  schema: {
    fieldName: {
      type: 'keyword',
      _meta: {
        description: 'Field Name',
        optional: false,
      },
    },
    actionId: {
      type: 'keyword',
      _meta: {
        description: 'Action id',
        optional: false,
      },
    },
    displayName: {
      type: 'keyword',
      _meta: {
        description: 'User friendly action name',
        optional: false,
      },
    },
    metadata: {
      type: 'pass_through',
      _meta: {
        description: 'Action metadata',
        optional: true,
      },
    },
  },
};

const breadCrumbClickedEvent: AppTelemetryEvent = {
  eventType: AppEventTypes.BreadcrumbClicked,
  schema: {
    title: {
      type: 'keyword',
      _meta: {
        description: 'Breadcrumb title',
        optional: false,
      },
    },
  },
};

export const appTelemetryEvents = [cellActionClickedEvent, breadCrumbClickedEvent];
