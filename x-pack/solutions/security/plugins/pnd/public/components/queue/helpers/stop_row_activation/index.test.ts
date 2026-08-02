/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stopRowActivation } from '.';

describe('stopRowActivation', () => {
  it('stops mouse propagation so a nested control cannot activate the row', () => {
    const event = { stopPropagation: jest.fn() };

    stopRowActivation(event);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('stops keydown propagation too, which is the same trap on the keyboard path', () => {
    const event = { stopPropagation: jest.fn() };

    stopRowActivation(event);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });
});
