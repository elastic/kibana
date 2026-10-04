/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMonitorSpaceToAppend } from './use_edit_monitor_locator';

describe('getMonitorSpaceToAppend', () => {
  it('targets the monitor space when it is not the active space', () => {
    expect(getMonitorSpaceToAppend('fleet-admin', ['default', 'team-a'])).toEqual({
      spaceId: 'default',
    });
  });

  it('stays in the active space when the monitor is visible there', () => {
    expect(getMonitorSpaceToAppend('team-a', ['default', 'team-a'])).toEqual({});
    expect(getMonitorSpaceToAppend('team-a', ['*'])).toEqual({});
  });

  it('does nothing when the active or monitor spaces are unknown', () => {
    expect(getMonitorSpaceToAppend(undefined, ['default'])).toEqual({});
    expect(getMonitorSpaceToAppend('default', [])).toEqual({});
  });
});
