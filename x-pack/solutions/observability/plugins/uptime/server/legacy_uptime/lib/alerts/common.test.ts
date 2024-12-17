/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateState } from './common';

describe('updateState', () => {
  let spy: jest.SpyInstance<string, []>;
  beforeEach(() => {
    spy = jest.spyOn(Date.prototype, 'toISOString');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sets initial state values', () => {
    spy.mockImplementation(() => 'foo date string');
    const result = updateState({}, false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "foo date string",
          "firstTriggeredAt": undefined,
          "isTriggered": false,
          "lastCheckedAt": "foo date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": undefined,
        }
      `);
  });

  it('updates the correct field in subsequent calls', () => {
    spy
      .mockImplementationOnce(() => 'first date string')
      .mockImplementationOnce(() => 'second date string');
    const firstState = updateState({}, false);
    const secondState = updateState(firstState, true);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(firstState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": undefined,
          "isTriggered": false,
          "lastCheckedAt": "first date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": undefined,
        }
      `);
    expect(secondState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "second date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": true,
          "lastCheckedAt": "second date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "second date string",
        }
      `);
  });

  it('correctly marks resolution times', () => {
    spy
      .mockImplementationOnce(() => 'first date string')
      .mockImplementationOnce(() => 'second date string')
      .mockImplementationOnce(() => 'third date string');
    const firstState = updateState({}, true);
    const secondState = updateState(firstState, true);
    const thirdState = updateState(secondState, false);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(firstState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "first date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "first date string",
          "isTriggered": true,
          "lastCheckedAt": "first date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "first date string",
        }
      `);
    expect(secondState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "first date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "first date string",
          "isTriggered": true,
          "lastCheckedAt": "second date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "second date string",
        }
      `);
    expect(thirdState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "first date string",
          "isTriggered": false,
          "lastCheckedAt": "third date string",
          "lastResolvedAt": "third date string",
          "lastTriggeredAt": "second date string",
        }
      `);
  });

  it('correctly marks state fields across multiple triggers/resolutions', () => {
    spy
      .mockImplementationOnce(() => 'first date string')
      .mockImplementationOnce(() => 'second date string')
      .mockImplementationOnce(() => 'third date string')
      .mockImplementationOnce(() => 'fourth date string')
      .mockImplementationOnce(() => 'fifth date string');
    const firstState = updateState({}, false);
    const secondState = updateState(firstState, true);
    const thirdState = updateState(secondState, false);
    const fourthState = updateState(thirdState, true);
    const fifthState = updateState(fourthState, false);
    expect(spy).toHaveBeenCalledTimes(5);
    expect(firstState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": undefined,
          "isTriggered": false,
          "lastCheckedAt": "first date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": undefined,
        }
      `);
    expect(secondState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "second date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": true,
          "lastCheckedAt": "second date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "second date string",
        }
      `);
    expect(thirdState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": false,
          "lastCheckedAt": "third date string",
          "lastResolvedAt": "third date string",
          "lastTriggeredAt": "second date string",
        }
      `);
    expect(fourthState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "fourth date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": true,
          "lastCheckedAt": "fourth date string",
          "lastResolvedAt": "third date string",
          "lastTriggeredAt": "fourth date string",
        }
      `);
    expect(fifthState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": false,
          "lastCheckedAt": "fifth date string",
          "lastResolvedAt": "fifth date string",
          "lastTriggeredAt": "fourth date string",
        }
      `);
  });
});
