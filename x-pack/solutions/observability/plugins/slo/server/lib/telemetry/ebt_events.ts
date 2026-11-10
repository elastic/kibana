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
    _meta: { description: 'The SHA-256 hash of the SLO id.' },
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
  grouped: {
    type: 'boolean',
    _meta: { description: 'Whether the SLO is grouped by at least one field.' },
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
