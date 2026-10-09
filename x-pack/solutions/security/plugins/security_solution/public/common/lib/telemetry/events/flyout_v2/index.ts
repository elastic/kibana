/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutV2TelemetryEvent } from './types';
import {
  FlyoutV2EventTypes,
  FLYOUT_ACTION,
  FLYOUT_HEADER_ITEM,
  FLYOUT_ORIGIN,
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TYPE,
} from './types';

/** Joins all values of a const map into a pipe-separated string for schema descriptions. */
const list = (o: Record<string, string>): string => Object.values(o).join('|');

const FLYOUT_TYPE_DESCRIPTION = `Which v2 flyout this is (${list(FLYOUT_TYPE)})`;

const SESSION_DESCRIPTION = `Whether the flyout started a new session or was nested inside the currently open one (${list(
  FLYOUT_SESSION_KIND
)})`;

export const flyoutOpenedEvent: FlyoutV2TelemetryEvent = {
  eventType: FlyoutV2EventTypes.FlyoutOpened,
  schema: {
    surface: {
      type: 'keyword',
      _meta: {
        description: `Whether a top-level flyout or one of its child tools was opened (${list(
          FLYOUT_SURFACE
        )})`,
        optional: false,
      },
    },
    flyoutType: {
      type: 'keyword',
      _meta: {
        description: `${FLYOUT_TYPE_DESCRIPTION}. Required when surface is "${FLYOUT_SURFACE.FLYOUT}"; present for "${FLYOUT_SURFACE.TOOL}" only when the parent flyout is known`,
        optional: true,
      },
    },
    tool: {
      type: 'keyword',
      _meta: {
        description: `Which tool (child) flyout was opened, when surface is "${FLYOUT_SURFACE.TOOL}"`,
        optional: true,
      },
    },
    session: {
      type: 'keyword',
      _meta: {
        description: SESSION_DESCRIPTION,
        optional: false,
      },
    },
    origin: {
      type: 'keyword',
      _meta: {
        description: `The specific UI trigger the open action originated from, when known (${list(
          FLYOUT_ORIGIN
        )}). See FLYOUT_ORIGIN for the full set`,
        optional: true,
      },
    },
  },
};

export const flyoutClosedEvent: FlyoutV2TelemetryEvent = {
  eventType: FlyoutV2EventTypes.FlyoutClosed,
  schema: {
    flyoutType: {
      type: 'keyword',
      _meta: {
        description: `${FLYOUT_TYPE_DESCRIPTION}, when the parent flyout is known`,
        optional: true,
      },
    },
    tool: {
      type: 'keyword',
      _meta: {
        description: `Which tool (child) flyout was closed, if this was a tool flyout`,
        optional: true,
      },
    },
    session: {
      type: 'keyword',
      _meta: {
        description: SESSION_DESCRIPTION,
        optional: false,
      },
    },
    durationMs: {
      type: 'integer',
      _meta: {
        description: 'How long the flyout was open for, in milliseconds',
        optional: false,
      },
    },
  },
};

export const flyoutTabClickedEvent: FlyoutV2TelemetryEvent = {
  eventType: FlyoutV2EventTypes.FlyoutTabClicked,
  schema: {
    flyoutType: {
      type: 'keyword',
      _meta: {
        description: FLYOUT_TYPE_DESCRIPTION,
        optional: false,
      },
    },
    tabId: {
      type: 'keyword',
      _meta: {
        description: 'Tab ID (overview|table|json)',
        optional: false,
      },
    },
  },
};

export const flyoutActionClickedEvent: FlyoutV2TelemetryEvent = {
  eventType: FlyoutV2EventTypes.FlyoutActionClicked,
  schema: {
    flyoutType: {
      type: 'keyword',
      _meta: {
        description: FLYOUT_TYPE_DESCRIPTION,
        optional: false,
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: `Which action was clicked (${list(
          FLYOUT_ACTION
        )}). See FLYOUT_ACTION for the full set`,
        optional: false,
      },
    },
  },
};

export const flyoutHeaderItemClickedEvent: FlyoutV2TelemetryEvent = {
  eventType: FlyoutV2EventTypes.FlyoutHeaderItemClicked,
  schema: {
    flyoutType: {
      type: 'keyword',
      _meta: {
        description: FLYOUT_TYPE_DESCRIPTION,
        optional: false,
      },
    },
    item: {
      type: 'keyword',
      _meta: {
        description: `Which interactive control in the flyout header was clicked to open its popover (${list(
          FLYOUT_HEADER_ITEM
        )})`,
        optional: false,
      },
    },
  },
};

export const flyoutV2TelemetryEvents = [
  flyoutOpenedEvent,
  flyoutClosedEvent,
  flyoutTabClickedEvent,
  flyoutActionClickedEvent,
  flyoutHeaderItemClickedEvent,
];
