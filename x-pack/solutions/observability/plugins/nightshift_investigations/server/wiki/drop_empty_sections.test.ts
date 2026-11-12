/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dropEmptySections } from './drop_empty_sections';

describe('dropEmptySections', () => {
  it('removes a heading with nothing under it, in the middle of a page', () => {
    const content =
      '## Overview\nA service.\n\n## Tool failures\n\n## Common pitfalls\n- Use a filter.';

    expect(dropEmptySections(content)).toBe(
      '## Overview\nA service.\n\n## Common pitfalls\n- Use a filter.'
    );
  });

  it('removes an empty heading at the end of the page', () => {
    expect(dropEmptySections('## Overview\nA service.\n\n## Tool failures\n')).toBe(
      '## Overview\nA service.'
    );
  });

  it('removes several empty headings in a row', () => {
    expect(dropEmptySections('## A\n\n## B\n\n## C\ntext')).toBe('## C\ntext');
  });

  it('keeps a heading that only introduces deeper headings', () => {
    const content = '## Access\n### Sandbox\nUse curl.';

    expect(dropEmptySections(content)).toBe(content);
  });

  it('keeps a section whose only content is a fenced block', () => {
    const content = '## Relations\n```\na -> b : calls\n```';

    expect(dropEmptySections(content)).toBe(content);
  });

  it('leaves a page without empty sections as it is', () => {
    const content = '## Overview\nA service.\n\n## Dependencies\n- cache';

    expect(dropEmptySections(content)).toBe(content);
  });

  it('keeps the page title and text before the first heading', () => {
    expect(dropEmptySections('# Title\nIntro.\n\n## Empty\n')).toBe('# Title\nIntro.');
  });
});
