/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCortexRelations } from './cortex_relations';

describe('parseCortexRelations', () => {
  it('reads the edges of a fenced Relations block', () => {
    const content = [
      '## Nodes',
      '- checkout-api',
      '',
      '## Relations',
      '```',
      'checkout-api -> session-cache : depends_on',
      'checkout-gateway -> checkout-api : calls',
      '```',
      '',
      '## Concepts',
      'A session is a user login.',
    ].join('\n');

    expect(parseCortexRelations(content)).toEqual([
      { from: 'checkout-api', to: 'session-cache', kind: 'depends_on' },
      { from: 'checkout-gateway', to: 'checkout-api', kind: 'calls' },
    ]);
  });

  it('accepts edges written as list items and names with dots and slashes', () => {
    const content = '## Relations\n- logs-checkout.log -> payments/adapter : reads_from';

    expect(parseCortexRelations(content)).toEqual([
      { from: 'logs-checkout.log', to: 'payments/adapter', kind: 'reads_from' },
    ]);
  });

  it('leaves out lines that are not edges or use an unknown kind', () => {
    const content = [
      '## Relations',
      'This service is central.',
      'a -> b : likes',
      'a -> b',
      'a -> b : runs_on',
    ].join('\n');

    expect(parseCortexRelations(content)).toEqual([{ from: 'a', to: 'b', kind: 'runs_on' }]);
  });

  it('ignores edges outside the Relations section', () => {
    const content = '## Concepts\na -> b : calls\n\n## Relations\nc -> d : calls';

    expect(parseCortexRelations(content)).toEqual([{ from: 'c', to: 'd', kind: 'calls' }]);
  });

  it('returns nothing when the page has no Relations section', () => {
    expect(parseCortexRelations('## Nodes\n- a')).toEqual([]);
  });
});
