/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GRID_SIZE,
  STACK_NODE_MIN_HEIGHT,
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_LABEL_WIDTH,
  NODE_LABEL_HEIGHT,
} from './constants';

describe('constants', () => {
  it('should set STACK_NODE_MIN_HEIGHT a multiplication of 2*GRID_SIZE', () => {
    expect(STACK_NODE_MIN_HEIGHT % (2 * GRID_SIZE)).toBe(0);
  });

  it('should set NODE_WIDTH a multiplication of 2*GRID_SIZE', () => {
    expect(NODE_WIDTH % (2 * GRID_SIZE)).toBe(0);
  });

  it('should set NODE_HEIGHT a multiplication of 2*GRID_SIZE', () => {
    expect(NODE_HEIGHT % (2 * GRID_SIZE)).toBe(0);
  });

  it('should set NODE_LABEL_WIDTH a multiplication of 2*GRID_SIZE', () => {
    expect(NODE_LABEL_WIDTH % (2 * GRID_SIZE)).toBe(0);
  });

  it('should set NODE_LABEL_HEIGHT a multiplication of 2*GRID_SIZE', () => {
    expect(NODE_LABEL_HEIGHT % (2 * GRID_SIZE)).toBe(0);
  });
});
