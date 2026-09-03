/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../../../../common/constants';
import { buildExecutionCorrelationHeaders } from '.';

describe('buildExecutionCorrelationHeaders', () => {
  it('stamps true when at least one run correlated', () => {
    expect(buildExecutionCorrelationHeaders(true)).toEqual({
      [PND_EXECUTION_CORRELATED_HEADER]: 'true',
    });
  });

  it('stamps false when no run correlated, so an empty skeleton is distinguishable', () => {
    expect(buildExecutionCorrelationHeaders(false)).toEqual({
      [PND_EXECUTION_CORRELATED_HEADER]: 'false',
    });
  });
});
