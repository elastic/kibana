/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ALERTZERO_UI_EVENTS,
  BRIEF_CARD_CONVERSATION_TYPES,
  BRIEF_CARD_SECTIONS,
  QUEUE_FILTER_TYPES,
  QUEUE_SIZE_BUCKETS,
  UI_ERROR_CLASSES,
  UI_ERROR_SURFACES,
} from './constants';
import type { AlertZeroUiEventPayloads } from './events';
import { ALERTZERO_UI_EVENT_TYPES } from './events';
import { registerAlertZeroUiEvents } from './register_ui_events';

const README = readFileSync(join(__dirname, 'README.md'), 'utf8');

/** Identity and free-text field names no AlertZero UI event may declare. */
const DENYLISTED_FIELD_NAMES = [
  'comment',
  'description',
  'email',
  'entity',
  'entity_id',
  'message',
  'name',
  'space_id',
  'title',
  'user',
  'username',
];

const FIXTURES: AlertZeroUiEventPayloads = {
  [ALERTZERO_UI_EVENTS.HomeOpened]: { default_filters_changed: false, queue_size_bucket: '11_50' },
  [ALERTZERO_UI_EVENTS.QueueFiltered]: { filter_type: 'impact' },
  [ALERTZERO_UI_EVENTS.BriefCardClicked]: {
    conversation_type: 'investigation',
    has_pending_proposal: true,
    position_in_list: 2,
    section: 'investigate',
  },
  [ALERTZERO_UI_EVENTS.ErrorShown]: { error_class: 'forbidden', surface: 'watch_settings' },
};

const createRegisteredAnalytics = () => {
  const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
  registerAlertZeroUiEvents(analytics);
  return analytics;
};

const fieldsOf = (eventType: string) =>
  Object.entries(
    ALERTZERO_UI_EVENT_TYPES.find((event) => event.eventType === eventType)?.schema ?? {}
  ) as Array<[string, { _meta: { description: string; optional: boolean }; type: string }]>;

/** The README section of one event: from its heading to the next heading. */
const readmeSection = (eventType: string): string => {
  const [, afterHeading = ''] = README.split(`### \`${eventType}\`\n`);
  return afterHeading.split(/^#{2,3} /m)[0];
};

describe('AlertZero UI events', () => {
  it('registers exactly the events in the event name map', () => {
    expect(ALERTZERO_UI_EVENT_TYPES.map(({ eventType }) => eventType)).toEqual(
      Object.values(ALERTZERO_UI_EVENTS)
    );
  });

  it.each(Object.values(ALERTZERO_UI_EVENTS))('names %s alertzero_ui_<object>_<verb>', (name) => {
    expect(name).toMatch(/^alertzero_ui_[a-z]+(_[a-z]+)+$/);
  });

  describe.each(Object.values(ALERTZERO_UI_EVENTS))('%s', (eventType) => {
    it('describes every field and says whether it is optional', () => {
      expect(
        fieldsOf(eventType).filter(
          ([, { _meta }]) => !_meta.description || typeof _meta.optional !== 'boolean'
        )
      ).toEqual([]);
    });

    it('has no free-text or identity field', () => {
      expect(
        fieldsOf(eventType).filter(
          ([name, { type }]) => type === 'text' || DENYLISTED_FIELD_NAMES.includes(name)
        )
      ).toEqual([]);
    });

    it('is documented in the README', () => {
      expect(readmeSection(eventType)).not.toBe('');
    });

    it('accepts a valid payload in dev mode', () => {
      const analytics = createRegisteredAnalytics();

      expect(() =>
        analytics.reportEvent(eventType, FIXTURES[eventType as keyof AlertZeroUiEventPayloads])
      ).not.toThrow();
    });

    it('rejects a payload with an undeclared field in dev mode', () => {
      const analytics = createRegisteredAnalytics();

      expect(() =>
        analytics.reportEvent(eventType, {
          ...FIXTURES[eventType as keyof AlertZeroUiEventPayloads],
          message: 'Request failed',
        })
      ).toThrow();
    });

    it('rejects a payload missing a required field in dev mode', () => {
      const analytics = createRegisteredAnalytics();
      const [[firstField]] = fieldsOf(eventType);
      const { [firstField]: _omitted, ...payload } = FIXTURES[
        eventType as keyof AlertZeroUiEventPayloads
      ] as unknown as Record<string, unknown>;

      expect(() => analytics.reportEvent(eventType, payload)).toThrow();
    });
  });

  it.each([
    [ALERTZERO_UI_EVENTS.HomeOpened, 'queue_size_bucket', QUEUE_SIZE_BUCKETS],
    [ALERTZERO_UI_EVENTS.QueueFiltered, 'filter_type', QUEUE_FILTER_TYPES],
    [ALERTZERO_UI_EVENTS.BriefCardClicked, 'conversation_type', BRIEF_CARD_CONVERSATION_TYPES],
    [ALERTZERO_UI_EVENTS.BriefCardClicked, 'section', BRIEF_CARD_SECTIONS],
    [ALERTZERO_UI_EVENTS.ErrorShown, 'error_class', UI_ERROR_CLASSES],
    [ALERTZERO_UI_EVENTS.ErrorShown, 'surface', UI_ERROR_SURFACES],
  ] as const)(
    'lists the whole %s %s vocabulary in the schema and the README',
    (eventType, field, values) => {
      const [, { _meta }] = fieldsOf(eventType).find(([name]) => name === field) ?? [
        field,
        { _meta: { description: '' } },
      ];

      expect({
        readme: values.filter((value) => !readmeSection(eventType).includes(`\`${value}\``)),
        schema: values.filter((value) => !_meta.description.includes(`\`${value}\``)),
      }).toEqual({ readme: [], schema: [] });
    }
  );

  it.each([
    [
      ALERTZERO_UI_EVENTS.QueueFiltered,
      'filter_type',
      ['status', 'assignee', 'type', 'time_range', 'other'],
    ],
    [ALERTZERO_UI_EVENTS.BriefCardClicked, 'conversation_type', ['escalation']],
    [ALERTZERO_UI_EVENTS.ErrorShown, 'surface', ['escalations']],
  ] as const)('lists no %s %s value that no UI sends yet', (eventType, field, unsentValues) => {
    const [, { _meta }] = fieldsOf(eventType).find(([name]) => name === field) ?? [
      field,
      { _meta: { description: '' } },
    ];

    expect({
      readme: unsentValues.filter((value) => readmeSection(eventType).includes(`\`${value}\``)),
      schema: unsentValues.filter((value) => _meta.description.includes(`\`${value}\``)),
    }).toEqual({ readme: [], schema: [] });
  });
});
