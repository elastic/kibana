/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEventValue } from './events';
import { createAlert } from '../__mocks__/alerts';

describe('getEventValue', () => {
  it('return value if field present in event in object notation', () => {
    expect(
      getEventValue(
        createAlert('1', {
          host: {
            name: 'host name 1',
          },
        }),
        'host.name'
      )
    ).toEqual('host name 1');
  });

  it('return value if field present in event in string notation', () => {
    expect(
      getEventValue(
        createAlert('1', {
          'host.name': 'host name 2',
        }),
        'host.name'
      )
    ).toEqual('host name 2');
  });

  it('return value from object if both notation presents', () => {
    expect(
      getEventValue(
        createAlert('1', {
          'host.name': 'host name 2',
          host: {
            name: 'host name 1',
          },
        }),
        'host.name'
      )
    ).toEqual('host name 1');
  });

  it('return first item  if it is array', () => {
    expect(
      getEventValue(
        createAlert('1', {
          host: {
            name: ['host name 1', 'host name 2'],
          },
        }),
        'host.name'
      )
    ).toEqual('host name 1');
  });
});
