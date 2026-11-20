/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEventsIndexNameProblem } from './analytics_events_index';

describe('getEventsIndexNameProblem', () => {
  it.each(['events', 'app-events_2026', 'événements', 'a.b'])('accepts %s', (name) => {
    expect(getEventsIndexNameProblem(name)).toBeUndefined();
  });

  it.each([
    ['', 'empty'],
    ['a'.repeat(256), 'tooLong'],
    ['é'.repeat(128), 'tooLong'],
    ['Events', 'uppercase'],
    ['my events', 'invalidCharacters'],
    ['logs*', 'invalidCharacters'],
    ['a,b', 'invalidCharacters'],
    ['cluster:events', 'invalidCharacters'],
    ['a/b', 'invalidCharacters'],
    ['-events', 'invalidStart'],
    ['_events', 'invalidStart'],
    ['+events', 'invalidStart'],
    ['.events', 'invalidStart'],
    ['..', 'invalidStart'],
  ])('rejects %j as %s', (name, problem) => {
    expect(getEventsIndexNameProblem(name)).toBe(problem);
  });

  it('accepts the longest name Elasticsearch takes', () => {
    expect(getEventsIndexNameProblem('a'.repeat(255))).toBeUndefined();
  });
});
