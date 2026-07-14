/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutV2TelemetryEvent } from './types';
import { FlyoutV2EventTypes } from './types';

const FLYOUT_TYPE_DESCRIPTION =
  'Which v2 flyout this is (document|attack|ioc|network|rule|host|user|service|generic|misconfiguration|vulnerability)';

const SESSION_DESCRIPTION =
  'Whether the flyout started a new session or was nested inside the currently open one (start|inherit)';

export const flyoutOpenedEvent: FlyoutV2TelemetryEvent = {
  eventType: FlyoutV2EventTypes.FlyoutOpened,
  schema: {
    surface: {
      type: 'keyword',
      _meta: {
        description:
          'Whether a top-level flyout or one of its child tools was opened (flyout|tool)',
        optional: false,
      },
    },
    flyoutType: {
      type: 'keyword',
      _meta: {
        description: `${FLYOUT_TYPE_DESCRIPTION}. Required when surface is "flyout"; present for "tool" only when the parent flyout is known`,
        optional: true,
      },
    },
    tool: {
      type: 'keyword',
      _meta: {
        description: 'Which tool (child) flyout was opened, when surface is "tool"',
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
        description:
          'The specific UI trigger the open action originated from, when known (e.g. flyout_header|footer_take_action|insights_alerts|risk_summary_entity|graph_node|resolution_entity_link|tool_header_title|entities_list|field_link|alerts_table|timeline|case_attachment). See FlyoutOrigin for the full set',
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
        description: 'Which tool (child) flyout was closed, if this was a tool flyout',
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
        description:
          'Which action was clicked (e.g. add_to_case_new|add_to_case_existing|status_open|status_acknowledged|status_closed|add_tags|add_assignees|remove_assignees|add_endpoint_exception|add_rule_exception|isolate_host|run_workflow|respond|add_note|investigate_in_timeline|explore). See FlyoutActionType for the full set',
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
        description:
          'Which interactive control in the flyout header was clicked to open its popover (assignees|status)',
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
