/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlFromContent } from './common';

describe('common', () => {
  it.each([
    ['```esqlhelloworld```', ['helloworld']],
    ['```esqlhelloworld``````esqlhelloworld```', ['helloworld', 'helloworld']],
  ])('should add %s and %s', (input: string, expectedResult: string[]) => {
    expect(getEsqlFromContent(input)).toEqual(expectedResult);
  });
});