/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withAdditionalContext } from './with_additional_context';

describe('withAdditionalContext', () => {
  it('returns the prompt unchanged without context', () => {
    expect(withAdditionalContext('PROMPT')).toBe('PROMPT');
  });

  it('returns the prompt unchanged for empty context', () => {
    expect(withAdditionalContext('PROMPT', '')).toBe('PROMPT');
  });

  it('appends whitespace-only context, as the product does', () => {
    expect(withAdditionalContext('PROMPT', '  \n')).toBe('PROMPT\n\nAdditional context:\n  \n');
  });

  it('appends the context in the product format', () => {
    expect(withAdditionalContext('PROMPT', 'ctx')).toBe('PROMPT\n\nAdditional context:\nctx');
  });
});
