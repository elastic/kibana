/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatInlinedIndex, MAX_INLINED_INDEX_CHARS } from './hydrate_notification';

describe('formatInlinedIndex', () => {
  it('inlines an index within the size cap', () => {
    const notification = formatInlinedIndex(
      '/workspace/cortex/INDEX.md',
      '# Cortex index\n\n- a\n'
    );

    expect(notification).toBe(
      'Contents of `/workspace/cortex/INDEX.md` (already read for you — do not open it again):\n\n' +
        '# Cortex index\n\n- a'
    );
  });

  it('points to an index over the size cap instead of inlining it', () => {
    const content = 'x'.repeat(MAX_INLINED_INDEX_CHARS + 1);

    const notification = formatInlinedIndex('/workspace/cortex/INDEX.md', content);

    expect(notification).toBe(
      '`/workspace/cortex/INDEX.md` is too large to include here; open it before investigating.'
    );
    expect(notification).not.toContain('xxx');
  });
});
