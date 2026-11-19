/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseWikiRelations, tidyWikiOntology } from './wiki_relations';

describe('parseWikiRelations', () => {
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

    expect(parseWikiRelations(content)).toEqual([
      { from: 'checkout-api', to: 'session-cache', kind: 'depends_on' },
      { from: 'checkout-gateway', to: 'checkout-api', kind: 'calls' },
    ]);
  });

  it('accepts edges written as list items and names with dots and slashes', () => {
    const content = '## Relations\n- logs-checkout.log -> payments/adapter : reads_from';

    expect(parseWikiRelations(content)).toEqual([
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

    expect(parseWikiRelations(content)).toEqual([{ from: 'a', to: 'b', kind: 'runs_on' }]);
  });

  it('ignores edges outside the Relations section', () => {
    const content = '## Concepts\na -> b : calls\n\n## Relations\nc -> d : calls';

    expect(parseWikiRelations(content)).toEqual([{ from: 'c', to: 'd', kind: 'calls' }]);
  });

  it('returns nothing when the page has no Relations section', () => {
    expect(parseWikiRelations('## Nodes\n- a')).toEqual([]);
  });
});

describe('tidyWikiOntology', () => {
  const page = (...edges: string[]) =>
    [
      '## Nodes',
      '- fleet',
      '- external-dns-projects',
      '- logging-telemetry',
      '',
      '## Relations',
      '```',
      ...edges,
      '```',
      '',
      '## Concepts',
      '- A concept that mentions fleet -> external-dns-projects : depends_on in prose.',
    ].join('\n');

  it('leaves a clean page unchanged', () => {
    const content = page('fleet -> external-dns-projects : depends_on');

    expect(tidyWikiOntology(content)).toEqual({ content, dropped: [] });
  });

  it('drops an edge from a component to itself', () => {
    const { content, dropped } = tidyWikiOntology(page('fleet -> fleet : calls'));

    expect(content).not.toContain('fleet -> fleet');
    expect(dropped).toEqual([{ line: 'fleet -> fleet : calls', reason: 'self_edge' }]);
  });

  it('drops a repeated edge and keeps the first', () => {
    const { content, dropped } = tidyWikiOntology(
      page(
        'fleet -> external-dns-projects : depends_on',
        'fleet -> external-dns-projects : depends_on'
      )
    );

    expect(content.match(/fleet -> external-dns-projects : depends_on/g)).toHaveLength(2);
    expect(dropped.map(({ reason }) => reason)).toEqual(['duplicate']);
  });

  it('keeps the first edge when the same kind is also stated in reverse', () => {
    const { content, dropped } = tidyWikiOntology(
      page(
        'external-dns-projects -> fleet : publishes_to',
        'fleet -> external-dns-projects : publishes_to'
      )
    );

    expect(content).toContain('external-dns-projects -> fleet : publishes_to');
    expect(content).not.toContain('fleet -> external-dns-projects : publishes_to');
    expect(dropped).toEqual([
      { line: 'fleet -> external-dns-projects : publishes_to', reason: 'mirrored' },
    ]);
  });

  it('keeps a reverse edge of another kind and a reverse calls edge', () => {
    const { content, dropped } = tidyWikiOntology(
      page(
        'fleet -> external-dns-projects : calls',
        'external-dns-projects -> fleet : calls',
        'fleet -> external-dns-projects : depends_on',
        'external-dns-projects -> fleet : reads_from'
      )
    );

    expect(content).toContain('external-dns-projects -> fleet : calls');
    expect(content).toContain('external-dns-projects -> fleet : reads_from');
    expect(dropped).toEqual([]);
  });

  it('drops the edges and the node line of an excluded component', () => {
    const { content, dropped } = tidyWikiOntology(
      page('fleet -> logging-telemetry : publishes_to', 'fleet -> external-dns-projects : calls'),
      new Set(['logging-telemetry'])
    );

    expect(content).not.toContain('- logging-telemetry');
    expect(content).not.toContain('fleet -> logging-telemetry');
    expect(content).toContain('fleet -> external-dns-projects : calls');
    expect(dropped.map(({ reason }) => reason)).toEqual(['excluded', 'excluded']);
  });

  it('keeps a dependency on an excluded component and drops only its telemetry edges', () => {
    const { content, dropped } = tidyWikiOntology(
      page('fleet -> logging-telemetry : publishes_to', 'fleet -> logging-telemetry : depends_on'),
      new Set(['logging-telemetry'])
    );

    expect(content).toContain('fleet -> logging-telemetry : depends_on');
    expect(content).not.toContain('fleet -> logging-telemetry : publishes_to');
    expect(content).toContain('- logging-telemetry');
    expect(dropped.map(({ reason }) => reason)).toEqual(['excluded']);
  });

  it('leaves text outside the Nodes and Relations sections alone', () => {
    const { content } = tidyWikiOntology(page('fleet -> fleet : calls'));

    expect(content).toContain(
      'A concept that mentions fleet -> external-dns-projects : depends_on'
    );
  });

  it('keeps a line whose kind is unknown, since the parser ignores it anyway', () => {
    const content = page('fleet -> external-dns-projects : likes');

    expect(tidyWikiOntology(content).content).toBe(content);
  });
});
