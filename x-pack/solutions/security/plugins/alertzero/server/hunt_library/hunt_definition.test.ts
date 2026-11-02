/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractSurroundingPlaceholders, parseHuntDefinition } from './hunt_definition';

const aggregate = () => ({
  id: 'sample_hunt',
  version: 1,
  name: 'Sample hunt',
  description: 'A sample.',
  hypothesis: 'A hypothesis.',
  platform: ['linux'],
  mitreTechniques: ['T1059', 'T1059.004'],
  references: ['https://example.com/ref'],
  guidance: {
    analystNotes: ['note'],
    expectedFalsePositives: ['fp'],
    suggestedPivots: ['pivot'],
  },
  query: {
    id: 'main',
    language: 'esql',
    query: 'from logs-a-* | stats cc = count(), last_seen = max(@timestamp) by process.name',
    resultKind: 'aggregate',
    defaultTimeRange: { from: 'now-7d', to: 'now' },
    recommendedColumns: ['process.name', 'cc', 'last_seen'],
    requiredIndexPatterns: ['logs-a-*'],
    requiredFields: ['process.name', '@timestamp'],
    evidenceFields: ['process.name', 'cc'],
    adjudicationFields: ['process.name', 'cc', 'host.name'],
    surroundingEventQuery:
      'from logs-a-* METADATA _index, _id | where @timestamp >= {{param.bucket_start}} and @timestamp < {{param.bucket_end}} | where process.name == {{param.process.name}} | keep _index, _id, @timestamp',
    occurrence: { keyFields: ['process.name'], timeField: 'last_seen', bucket: '1d' },
  },
  source: {
    kind: 'elastic_seed',
    tradeId: 'abc',
    path: 'hunting/linux/a.toml',
    revision: 'deadbeef',
  },
});

const rawEvent = () => {
  const definition = aggregate();
  return {
    ...definition,
    query: {
      ...definition.query,
      resultKind: 'raw_event',
      query: 'from logs-a-* METADATA _index, _id | keep _index, _id, @timestamp, process.name',
      recommendedColumns: ['_index', '_id', '@timestamp', 'process.name'],
      surroundingEventQuery: undefined,
      occurrence: { keyFields: ['process.name'], timeField: '@timestamp', bucket: '1h' },
    },
  };
};

type Mutable = ReturnType<typeof aggregate> & Record<string, any>;

describe('parseHuntDefinition', () => {
  it('accepts a valid aggregate and a valid raw event definition', () => {
    expect(parseHuntDefinition(aggregate()).id).toBe('sample_hunt');
    expect(parseHuntDefinition(rawEvent()).query.resultKind).toBe('raw_event');
  });

  it.each<[string, (d: Mutable) => void]>([
    ['an id that starts with a digit', (d) => (d.id = '1bad')],
    ['an id with upper case', (d) => (d.id = 'Bad_id')],
    ['an id that is too short', (d) => (d.id = 'a')],
    ['a zero version', (d) => (d.version = 0)],
    ['a fractional version', (d) => (d.version = 1.5)],
    ['an empty name', (d) => (d.name = '')],
    ['a name over 120 characters', (d) => (d.name = 'n'.repeat(121))],
    ['a description over 4000 characters', (d) => (d.description = 'd'.repeat(4001))],
    ['an empty platform list', (d) => (d.platform = [])],
    ['an unknown platform', (d) => (d.platform = ['solaris'])],
    ['an upper-case platform', (d) => (d.platform = ['Linux'])],
    ['duplicate platforms', (d) => (d.platform = ['linux', 'linux'])],
    ['a malformed MITRE id', (d) => (d.mitreTechniques = ['59'])],
    ['duplicate MITRE ids', (d) => (d.mitreTechniques = ['T1059', 'T1059'])],
    ['a non-URL reference', (d) => (d.references = ['not a url'])],
    [
      'more than 20 references',
      (d) => (d.references = Array.from({ length: 21 }, (_, i) => `https://example.com/${i}`)),
    ],
    [
      'more than 20 notes',
      (d) => (d.guidance.analystNotes = Array.from({ length: 21 }, (_, i) => `n${i}`)),
    ],
    ['a note over 1024 characters', (d) => (d.guidance.suggestedPivots = ['p'.repeat(1025)])],
    ['an unknown top-level key', (d) => (d.extra = true)],
    ['a non-esql language', (d) => (d.query.language = 'eql')],
    ['an empty query', (d) => (d.query.query = '')],
    ['a query over 20000 characters', (d) => (d.query.query = `from a ${'x'.repeat(20000)}`)],
    ['a query that does not start with FROM', (d) => (d.query.query = 'row a = 1')],
    [
      'a placeholder in the candidate query',
      (d) => (d.query.query = 'from a | where x == {{param.process.name}}'),
    ],
    ['a missing result kind', (d) => delete (d.query as any).resultKind],
    ['a time range bound with a space', (d) => (d.query.defaultTimeRange.from = 'now - 7d')],
    [
      'a time range bound over 64 characters',
      (d) => (d.query.defaultTimeRange.to = 'n'.repeat(65)),
    ],
    ['no recommended columns', (d) => (d.query.recommendedColumns = [])],
    [
      'more than 30 recommended columns',
      (d) => (d.query.recommendedColumns = Array.from({ length: 31 }, (_, i) => `c${i}`)),
    ],
    ['a column with invalid characters', (d) => (d.query.recommendedColumns = ['process name'])],
    ['no required index patterns', (d) => (d.query.requiredIndexPatterns = [])],
    [
      'more than 16 index patterns',
      (d) => (d.query.requiredIndexPatterns = Array.from({ length: 17 }, (_, i) => `p${i}-*`)),
    ],
    ['no required fields', (d) => (d.query.requiredFields = [])],
    ['no evidence fields', (d) => (d.query.evidenceFields = [])],
    ['no adjudication fields', (d) => (d.query.adjudicationFields = [])],
    [
      'more than 30 adjudication fields',
      (d) => (d.query.adjudicationFields = Array.from({ length: 31 }, (_, i) => `f${i}`)),
    ],
    ['duplicate adjudication fields', (d) => (d.query.adjudicationFields = ['a', 'a'])],
    ['no occurrence key fields', (d) => (d.query.occurrence.keyFields = [])],
    [
      'more than 8 occurrence key fields',
      (d) => (d.query.occurrence.keyFields = Array.from({ length: 9 }, (_, i) => `k${i}`)),
    ],
    ['an unsupported bucket', (d) => ((d.query.occurrence as any).bucket = '5m')],
    [
      'a key field that is not a returned column',
      (d) => (d.query.occurrence.keyFields = ['host.name']),
    ],
    [
      'a time field that is not a returned column',
      (d) => (d.query.occurrence.timeField = 'missing'),
    ],
    [
      'an aggregate without a surrounding query',
      (d) => delete (d.query as any).surroundingEventQuery,
    ],
    [
      'a surrounding placeholder that is not a key field or bind',
      (d) =>
        (d.query.surroundingEventQuery = d.query.surroundingEventQuery!.replace(
          '{{param.process.name}}',
          '{{param.host.name}}'
        )),
    ],
    [
      'a malformed surrounding placeholder',
      (d) =>
        (d.query.surroundingEventQuery = `${d.query.surroundingEventQuery} {{param.bucket_start}`),
    ],
    [
      'a surrounding query without METADATA _id',
      (d) =>
        (d.query.surroundingEventQuery = d.query.surroundingEventQuery!.replace(
          'METADATA _index, _id',
          'METADATA _index'
        )),
    ],
    [
      'a surrounding query that does not keep _id',
      (d) =>
        (d.query.surroundingEventQuery = d.query.surroundingEventQuery!.replace(
          'keep _index, _id, @timestamp',
          'keep @timestamp'
        )),
    ],
    [
      'a surrounding query that does not start with FROM',
      (d) => (d.query.surroundingEventQuery = 'row a = 1 METADATA _index, _id | keep _index, _id'),
    ],
    ['an unknown source kind', (d) => ((d.source as any).kind = 'user')],
    ['an empty source revision', (d) => (d.source.revision = '')],
  ])('rejects %s', (_, mutate) => {
    const definition = aggregate() as Mutable;
    mutate(definition);

    expect(() => parseHuntDefinition(definition)).toThrow();
  });

  it('requires a raw event query to return _index and _id', () => {
    const definition = rawEvent();
    definition.query.recommendedColumns = ['@timestamp', 'process.name'];

    expect(() => parseHuntDefinition(definition)).toThrow(/_index/);
  });

  it('allows a raw event definition without a surrounding query', () => {
    expect(() => parseHuntDefinition(rawEvent())).not.toThrow();
  });

  it('accepts @timestamp as a column and field name', () => {
    const definition = rawEvent();
    definition.query.requiredFields = ['@timestamp', 'process.name'];

    expect(() => parseHuntDefinition(definition)).not.toThrow();
  });
});

describe('extractSurroundingPlaceholders', () => {
  it('lists dotted placeholder names in order', () => {
    expect(
      extractSurroundingPlaceholders(
        'a {{param.process.name}} b {{param.bucket_start}} {{param.x}}'
      )
    ).toEqual(['process.name', 'bucket_start', 'x']);
  });

  it('ignores text that is not a placeholder', () => {
    expect(extractSurroundingPlaceholders('{{ param.x }} {{param.}} {param.x}')).toEqual([]);
  });
});
