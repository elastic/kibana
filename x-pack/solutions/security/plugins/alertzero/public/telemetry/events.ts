/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/public';
import type {
  BriefCardConversationType,
  BriefCardSection,
  QueueFilterType,
  QueueSizeBucket,
  UiErrorClass,
  UiErrorSurface,
} from './constants';
import {
  ALERTZERO_UI_EVENTS,
  BRIEF_CARD_CONVERSATION_TYPES,
  BRIEF_CARD_SECTIONS,
  QUEUE_FILTER_TYPES,
  QUEUE_SIZE_BUCKETS,
  UI_ERROR_CLASSES,
  UI_ERROR_SURFACES,
} from './constants';

const formatValues = (values: readonly string[]): string =>
  values.map((value) => `\`${value}\``).join(', ');

export interface AlertZeroUiHomeOpenedPayload {
  default_filters_changed: boolean;
  queue_size_bucket: QueueSizeBucket;
}

export interface AlertZeroUiQueueFilteredPayload {
  filter_type: QueueFilterType;
}

export interface AlertZeroUiBriefCardClickedPayload {
  conversation_type: BriefCardConversationType;
  has_pending_proposal: boolean;
  position_in_list: number;
  section: BriefCardSection;
}

export interface AlertZeroUiErrorShownPayload {
  error_class: UiErrorClass;
  surface: UiErrorSurface;
}

/** The payload each AlertZero browser event type carries. */
export interface AlertZeroUiEventPayloads {
  [ALERTZERO_UI_EVENTS.HomeOpened]: AlertZeroUiHomeOpenedPayload;
  [ALERTZERO_UI_EVENTS.QueueFiltered]: AlertZeroUiQueueFilteredPayload;
  [ALERTZERO_UI_EVENTS.BriefCardClicked]: AlertZeroUiBriefCardClickedPayload;
  [ALERTZERO_UI_EVENTS.ErrorShown]: AlertZeroUiErrorShownPayload;
}

export const ALERTZERO_UI_HOME_OPENED_EVENT: EventTypeOpts<AlertZeroUiHomeOpenedPayload> = {
  eventType: ALERTZERO_UI_EVENTS.HomeOpened,
  schema: {
    default_filters_changed: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the queue opened with filters other than the defaults. Always false today: the queue has no saved filters',
        optional: false,
      },
    },
    queue_size_bucket: {
      type: 'keyword',
      _meta: {
        description: `How many proposals were open when the queue loaded, as a range: ${formatValues(
          QUEUE_SIZE_BUCKETS
        )}. \`unknown\` when the count failed to load`,
        optional: false,
      },
    },
  },
};

export const ALERTZERO_UI_QUEUE_FILTERED_EVENT: EventTypeOpts<AlertZeroUiQueueFilteredPayload> = {
  eventType: ALERTZERO_UI_EVENTS.QueueFiltered,
  schema: {
    filter_type: {
      type: 'keyword',
      _meta: {
        description: `Which queue filter or sort the user set: ${formatValues(
          QUEUE_FILTER_TYPES
        )}. Clearing a filter is not reported, and the filter value is never sent`,
        optional: false,
      },
    },
  },
};

export const ALERTZERO_UI_BRIEF_CARD_CLICKED_EVENT: EventTypeOpts<AlertZeroUiBriefCardClickedPayload> =
  {
    eventType: ALERTZERO_UI_EVENTS.BriefCardClicked,
    schema: {
      conversation_type: {
        type: 'keyword',
        _meta: {
          description: `The kind of conversation the card opened: ${formatValues(
            BRIEF_CARD_CONVERSATION_TYPES
          )}`,
          optional: false,
        },
      },
      has_pending_proposal: {
        type: 'boolean',
        _meta: {
          description: "Whether the card's proposal was still waiting for a decision",
          optional: false,
        },
      },
      position_in_list: {
        type: 'long',
        _meta: {
          description:
            'Zero-based position of the card in its queue section (`section`), after the Impact filter',
          optional: false,
        },
      },
      section: {
        type: 'keyword',
        _meta: {
          description: `The queue section the card was rendered in: ${formatValues(
            BRIEF_CARD_SECTIONS
          )}`,
          optional: false,
        },
      },
    },
  };

export const ALERTZERO_UI_ERROR_SHOWN_EVENT: EventTypeOpts<AlertZeroUiErrorShownPayload> = {
  eventType: ALERTZERO_UI_EVENTS.ErrorShown,
  schema: {
    error_class: {
      type: 'keyword',
      _meta: {
        description: `Fixed class of the error, never its message: ${formatValues(
          UI_ERROR_CLASSES
        )}`,
        optional: false,
      },
    },
    surface: {
      type: 'keyword',
      _meta: {
        description: `Where in AlertZero the error was shown: ${formatValues(UI_ERROR_SURFACES)}`,
        optional: false,
      },
    },
  },
};

/** Every AlertZero browser event type, in registration order. */
export const ALERTZERO_UI_EVENT_TYPES = [
  ALERTZERO_UI_HOME_OPENED_EVENT,
  ALERTZERO_UI_QUEUE_FILTERED_EVENT,
  ALERTZERO_UI_BRIEF_CARD_CLICKED_EVENT,
  ALERTZERO_UI_ERROR_SHOWN_EVENT,
] as const;
