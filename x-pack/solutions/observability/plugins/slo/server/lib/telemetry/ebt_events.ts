/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema, SchemaObject } from '@kbn/core/server';
import type { EventOrigin } from './event_origin';
import type {
  SloDefinitionEbtData,
  SloDeletedEbtData,
  SloEbtEventMap,
  SloEbtEventType,
  SloUpdatedEbtData,
} from './ebt_event_types';
import {
  SLO_CREATED_EBT_EVENT_TYPE,
  SLO_DELETED_EBT_EVENT_TYPE,
  SLO_RESET_EBT_EVENT_TYPE,
  SLO_UPDATED_EBT_EVENT_TYPE,
} from './ebt_event_types';

type WithOrigin<T> = T & { origin: EventOrigin };

type SloEbtEventTypeOpts<EventType extends SloEbtEventType> = EventTypeOpts<
  WithOrigin<SloEbtEventMap[EventType]>
>;

const eventOriginEbtSchema: SchemaObject<EventOrigin> = {
  properties: {
    actor: {
      type: 'keyword',
      _meta: {
        description:
          'Who made the change: always `user`, as SLO changes run with the credentials of the requesting user.',
      },
    },
    channel: {
      type: 'keyword',
      _meta: {
        description:
          'The channel the change was made through: `ui` for requests made by the Kibana browser app, `system` for Kibana acting on its own behalf, or `api` for any other request.',
      },
    },
    app: {
      type: 'keyword',
      _meta: {
        description:
          'The app the change was made from, as named in the execution context of a `ui` request. Absent otherwise.',
        optional: true,
      },
    },
  },
  _meta: {
    description: 'Where the change came from.',
  },
};

const sloDefinitionEbtSchema: RootSchema<WithOrigin<SloDefinitionEbtData>> = {
  slo_id: {
    type: 'keyword',
    _meta: { description: 'The id of the SLO.' },
  },
  revision: {
    type: 'long',
    _meta: { description: 'The revision of the SLO after the operation.' },
  },
  indicator_type: {
    type: 'keyword',
    _meta: { description: 'The SLI type, e.g. `sli.kql.custom` or `sli.apm.transactionDuration`.' },
  },
  budgeting_method: {
    type: 'keyword',
    _meta: { description: 'The budgeting method: `occurrences` or `timeslices`.' },
  },
  time_window_type: {
    type: 'keyword',
    _meta: { description: 'The time window type: `rolling` or `calendarAligned`.' },
  },
  time_window_duration: {
    type: 'keyword',
    _meta: { description: 'The time window duration, e.g. `30d` or `1w`.' },
  },
  objective_target: {
    type: 'float',
    _meta: { description: 'The objective target, between 0 and 1.' },
  },
  timeslice_target: {
    type: 'float',
    _meta: {
      description: 'The timeslice target, between 0 and 1. Only set for timeslices SLOs.',
      optional: true,
    },
  },
  timeslice_window: {
    type: 'keyword',
    _meta: {
      description: 'The timeslice window duration, e.g. `5m`. Only set for timeslices SLOs.',
      optional: true,
    },
  },
  group_by_count: {
    type: 'long',
    _meta: { description: 'The number of group by fields. 0 when the SLO is not grouped.' },
  },
  tags_count: {
    type: 'long',
    _meta: { description: 'The number of tags.' },
  },
  dashboards_count: {
    type: 'long',
    _meta: { description: 'The number of dashboards linked to the SLO.' },
  },
  enabled: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the SLO is enabled after the operation (for a deletion, whether it was enabled when deleted).',
    },
  },
  created_at: {
    type: 'date',
    _meta: { description: 'ISO timestamp of when the SLO was created.' },
  },
  settings: {
    properties: {
      sync_delay: {
        type: 'keyword',
        _meta: { description: 'The sync delay duration, e.g. `1m`.' },
      },
      frequency: {
        type: 'keyword',
        _meta: { description: 'The transform frequency duration, e.g. `1m`.' },
      },
      prevent_initial_backfill: {
        type: 'boolean',
        _meta: { description: 'Whether the initial backfill of historical data is skipped.' },
      },
      has_sync_field: {
        type: 'boolean',
        _meta: { description: 'Whether a custom sync field is configured.' },
      },
      has_project_routing: {
        type: 'boolean',
        _meta: { description: 'Whether a cross-project routing expression is configured.' },
      },
    },
    _meta: { description: 'The SLO settings.' },
  },
  origin: eventOriginEbtSchema,
};

const sloUpdatedEbtSchema: RootSchema<WithOrigin<SloUpdatedEbtData>> = {
  ...sloDefinitionEbtSchema,
  revision_bumped: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the update created a new revision, because a breaking field changed or the SLO resources were outdated.',
    },
  },
  changed_fields: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description:
          'A changed field: `name`, `description`, `indicator`, `timeWindow`, `budgetingMethod`, `objective`, `settings`, `tags`, `groupBy`, or `artifacts`.',
      },
    },
    _meta: { description: 'The SLO fields changed by the update.' },
  },
};

const sloDeletedEbtSchema: RootSchema<WithOrigin<SloDeletedEbtData>> = {
  ...sloDefinitionEbtSchema,
  bulk: {
    type: 'boolean',
    _meta: { description: 'Whether the SLO was deleted as part of a bulk deletion.' },
  },
};

export const sloCreatedEbtEvent: SloEbtEventTypeOpts<typeof SLO_CREATED_EBT_EVENT_TYPE> = {
  eventType: SLO_CREATED_EBT_EVENT_TYPE,
  schema: sloDefinitionEbtSchema,
};

export const sloUpdatedEbtEvent: SloEbtEventTypeOpts<typeof SLO_UPDATED_EBT_EVENT_TYPE> = {
  eventType: SLO_UPDATED_EBT_EVENT_TYPE,
  schema: sloUpdatedEbtSchema,
};

export const sloDeletedEbtEvent: SloEbtEventTypeOpts<typeof SLO_DELETED_EBT_EVENT_TYPE> = {
  eventType: SLO_DELETED_EBT_EVENT_TYPE,
  schema: sloDeletedEbtSchema,
};

export const sloResetEbtEvent: SloEbtEventTypeOpts<typeof SLO_RESET_EBT_EVENT_TYPE> = {
  eventType: SLO_RESET_EBT_EVENT_TYPE,
  schema: sloDefinitionEbtSchema,
};
