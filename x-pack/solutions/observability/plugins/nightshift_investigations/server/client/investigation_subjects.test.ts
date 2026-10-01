/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSnapshot } from '../../common';
import {
  buildFollowUpMessage,
  recoverSubjectsFromInputs,
  toStartSubjects,
  toSubjectKeys,
  withoutRecordedSubjects,
} from './investigation_subjects';

const makeAlert = (id: string): AlertSnapshot => ({
  id,
  rule_id: 'rule-1',
  rule_name: 'Latency is too high',
  rule_type_id: 'apm.transaction_duration',
  rule_category: 'Latency threshold',
  reason: `Latency is 2.5s for ${id}`,
  status: 'active',
  start: '2026-08-24T12:00:00.000Z',
});

describe('toStartSubjects', () => {
  it('records one alert subject per snapshot, carrying the snapshot', () => {
    expect(
      toStartSubjects({
        subject: { type: 'alert', id: 'alert-1', summary: 'Checkout latency' },
        alerts: [makeAlert('alert-1'), makeAlert('alert-2')],
        triggerType: 'automatic',
        investigationId: 'inv-1',
      })
    ).toEqual([
      {
        type: 'alert',
        id: 'alert-1',
        triggerType: 'automatic',
        snapshot: makeAlert('alert-1'),
        summary: 'Checkout latency',
      },
      { type: 'alert', id: 'alert-2', triggerType: 'automatic', snapshot: makeAlert('alert-2') },
    ]);
  });

  it('keeps the named alert when no snapshot carries its id', () => {
    expect(
      toStartSubjects({
        subject: { type: 'alert', id: 'alert-0' },
        alerts: [makeAlert('alert-1')],
        triggerType: 'manual',
        investigationId: 'inv-1',
      }).map(({ id }) => id)
    ).toEqual(['alert-0', 'alert-1']);
  });

  it('records a question without a subject id under the investigation id', () => {
    const subjects = toStartSubjects({
      subject: { type: 'manual', id: 'manual', summary: 'Why?' },
      triggerType: 'manual',
      investigationId: 'inv-1',
    });

    expect(subjects).toEqual([
      { type: 'manual', id: 'inv-1', triggerType: 'manual', summary: 'Why?' },
    ]);
    expect(toSubjectKeys(subjects, 'inv-1')).toEqual([]);
  });

  it('matches by an explicit question id', () => {
    const subjects = toStartSubjects({
      subject: { type: 'manual', id: 'checkout-latency' },
      triggerType: 'manual',
      investigationId: 'inv-1',
    });

    expect(toSubjectKeys(subjects, 'inv-1')).toEqual([{ type: 'manual', id: 'checkout-latency' }]);
  });
});

describe('recoverSubjectsFromInputs', () => {
  it('prefers the subjects the start passed', () => {
    expect(
      recoverSubjectsFromInputs(
        {
          subjects: [{ type: 'alert', id: 'alert-1', snapshot: makeAlert('alert-1') }],
          context: { source: 'significant_event', significant_event_id: 'se-1' },
        },
        'inv-1'
      )
    ).toEqual([{ type: 'alert', id: 'alert-1', snapshot: makeAlert('alert-1') }]);
  });

  it('derives the subject from the context of a run started without subjects', () => {
    expect(
      recoverSubjectsFromInputs(
        {
          context: {
            source: 'alert',
            alert_id: 'alert-1',
            trigger_type: 'automatic',
            alerts: [makeAlert('alert-1')],
          },
        },
        'inv-1'
      )
    ).toEqual([
      { type: 'alert', id: 'alert-1', triggerType: 'automatic', snapshot: makeAlert('alert-1') },
    ]);
  });

  it.each([
    ['no inputs', undefined],
    ['no context', { title: 'x' }],
    ['an unknown source', { context: { source: 'pager', pager_id: 'p-1' } }],
    ['no subject id', { context: { source: 'significant_event' } }],
    ['subjects that do not validate', { subjects: [{ type: 'pager', id: 'p-1' }] }],
  ])('recovers nothing from %s', (_label, inputs) => {
    expect(recoverSubjectsFromInputs(inputs, 'inv-1')).toEqual([]);
  });
});

describe('withoutRecordedSubjects', () => {
  it('keeps only subjects the investigation does not hold', () => {
    expect(
      withoutRecordedSubjects(
        [
          { type: 'alert', id: 'alert-1' },
          { type: 'alert', id: 'alert-2' },
          { type: 'significant_event', id: 'alert-1' },
        ],
        [
          {
            id: 'doc-1',
            spaceId: 'default',
            conversationId: 'inv-1',
            subjectType: 'alert',
            subjectId: 'alert-1',
            createdAt: '2026-08-24T12:00:00.000Z',
          },
        ]
      )
    ).toEqual([
      { type: 'alert', id: 'alert-2' },
      { type: 'significant_event', id: 'alert-1' },
    ]);
  });
});

describe('buildFollowUpMessage', () => {
  it('describes only the new alerts', () => {
    const message = buildFollowUpMessage({
      subject: { type: 'alert', id: 'alert-1' },
      message: 'ignored',
      alerts: [makeAlert('alert-1'), makeAlert('alert-2')],
      newAlerts: [makeAlert('alert-2')],
    });

    expect(message).toMatch(/^This continues the investigation/);
    expect(message).toContain('New alerts joined it.');
    expect(message).toContain('<alert_data>');
    expect(message).toContain('Latency is 2.5s for alert-2');
    expect(message).not.toContain('Latency is 2.5s for alert-1');
  });

  it('keeps the caller message for other subjects', () => {
    expect(
      buildFollowUpMessage({
        subject: { type: 'significant_event', id: 'se-1' },
        message: 'Checkout errors re-opened',
        alerts: [],
        newAlerts: [],
      })
    ).toMatch(/^This continues the investigation[\s\S]*\n\nCheckout errors re-opened$/);
  });
});
