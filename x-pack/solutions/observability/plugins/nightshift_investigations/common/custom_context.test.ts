/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatCustomContextInstructions } from './custom_context';

describe('formatCustomContextInstructions', () => {
  it('returns an empty string when there are no non-blank snippets', () => {
    expect(formatCustomContextInstructions([])).toBe('');
    expect(formatCustomContextInstructions([{ text: '  ' }, { text: '\n' }])).toBe('');
  });

  it('joins trimmed snippets with a blank line inside the user context block', () => {
    expect(
      formatCustomContextInstructions([
        { text: ' Rule out release regressions first. ' },
        { text: '' },
        { text: 'Payments runs in us-east-1.' },
      ])
    ).toBe(
      '**USER CONTEXT**\n<user_provided_context>\nRule out release regressions first.\n\nPayments runs in us-east-1.\n</user_provided_context>'
    );
  });
});
