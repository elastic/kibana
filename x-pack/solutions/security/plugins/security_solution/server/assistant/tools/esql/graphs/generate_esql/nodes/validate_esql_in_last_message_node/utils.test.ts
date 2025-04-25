/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractEsqlFromContent } from './utils';

describe('common', () => {
  it.each([
    ['```esqlhelloworld```', ['helloworld']],
    ['```esqlhelloworld``````esqlhelloworld```', ['helloworld', 'helloworld']],
    ['```esql\nFROM sample_data```', ['FROM sample_data']],
    ['```esql\nFROM sample_data\n```', ['FROM sample_data']],
    ['```esql\nFROM sample_data\n| LIMIT 3\n```', ['FROM sample_data\n| LIMIT 3']],
  ])('should add %s and %s', (input: string, expectedResult: string[]) => {
    expect(extractEsqlFromContent(input)).toEqual(expectedResult);
  });
});
