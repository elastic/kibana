/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryValidator } from '../ports/query_validator';
import { queryTemplateRt, renderQueryTemplate, type RenderedQuery } from './query_codec';

/** Compares two types without relying on framework-specific type assertions. */
type Equal<Left, Right> = [Left] extends [Right] ? ([Right] extends [Left] ? true : false) : false;

/** Provides a representative valid query template for codec tests. */
const template = {
  description: 'Finds emitted payment errors.',
  evidence: [{ excerpt: 'logger.error(message)', line: 4, path: 'src/payment.ts' }],
  parameters: {
    enabled: {
      description: 'Enabled flag',
      kind: 'boolean' as const,
      name: 'enabled',
      example: false,
    },
    count: { description: 'Count', kind: 'number' as const, name: 'count', example: 42 },
    field: {
      description: 'Field',
      kind: 'identifier' as const,
      name: 'field',
      example: 'event.name',
    },
    message: {
      description: 'Message',
      kind: 'string' as const,
      name: 'message',
      example: 'say "hi"',
    },
    source: {
      description: 'Source',
      kind: 'source' as const,
      name: 'source',
      example: 'logs-payments-*',
    },
  },
  query:
    'FROM [[source]] | WHERE [[field]] == [[message]] AND enabled == [[enabled]] | LIMIT [[count]]',
  signalType: 'log' as const,
  title: 'Payment error',
};

describe('query contracts', () => {
  it('makes QueryValidator accept only a RenderedQuery', () => {
    const acceptsOnlyRenderedQuery: Equal<
      Parameters<QueryValidator['validate']>[0],
      RenderedQuery
    > = true;
    expect(acceptsOnlyRenderedQuery).toBe(true);
    expect(queryTemplateRt.decode(template)._tag).toBe('Right');
  });

  it('accepts comma-separated source examples and rejects empty source tokens', () => {
    expect(
      queryTemplateRt.decode({
        ...template,
        parameters: {
          ...template.parameters,
          source: { ...template.parameters.source, example: 'logs-a,cluster:logs-b' },
        },
      })._tag
    ).toBe('Right');
    for (const example of [',logs-a', 'logs-a,', 'logs-a,,logs-b']) {
      expect(
        queryTemplateRt.decode({
          ...template,
          parameters: {
            ...template.parameters,
            source: { ...template.parameters.source, example },
          },
        })._tag
      ).toBe('Left');
    }
  });

  it('renders every reserved token using its ES|QL context', () => {
    expect(renderQueryTemplate(template).query).toBe(
      'FROM logs-payments-* | WHERE `event.name` == "say \\"hi\\"" AND enabled == false | LIMIT 42'
    );
  });

  it('rejects placeholders embedded in ES|QL strings or identifiers', () => {
    for (const query of [
      'FROM [[source]] | WHERE message == "[[message]]" | LIMIT [[count]]',
      'FROM [[source]] | WHERE message == "prefix [[message]] suffix" | LIMIT [[count]]',
      'FROM [[source]] | WHERE message == "escaped \\" [[message]]" | LIMIT [[count]]',
      'FROM [[source]] | WHERE message == """[[message]]""" | LIMIT [[count]]',
      'FROM [[source]] | WHERE `[[field]]` IS NOT NULL | LIMIT [[count]]',
    ]) {
      expect(queryTemplateRt.decode({ ...template, query })._tag).toBe('Left');
    }
    expect(renderQueryTemplate(template).query).toContain('== "say \\"hi\\""');
  });

  it('treats braces as ordinary ES|QL text but reserves tokens inside quoted literals', () => {
    /** Combines ordinary ES|QL braces and array brackets with valid reserved tokens. */
    const ordinaryBraces = {
      ...template,
      query:
        'FROM [[source]] | DISSECT message "%{clientip} %{ident}" | WHERE note == "{literal}" AND value IN [1, 2] | LIMIT [[count]]',
      parameters: { source: template.parameters.source, count: template.parameters.count },
    };
    expect(queryTemplateRt.decode(ordinaryBraces)._tag).toBe('Right');
    expect(renderQueryTemplate(ordinaryBraces).query).toContain('"%{clientip} %{ident}"');
    expect(renderQueryTemplate(ordinaryBraces).query).toContain('"{literal}"');
    expect(renderQueryTemplate(ordinaryBraces).query).toContain('value IN [1, 2]');

    /** Places an undeclared reserved token inside a quoted string to prove context-free reservation. */
    const reservedLiteral = {
      ...template,
      query: 'FROM [[source]] | WHERE note == "[[literal]]" | LIMIT [[count]]',
    };
    expect(queryTemplateRt.decode(reservedLiteral)._tag).toBe('Left');
  });

  it('treats workflow delimiter text as ordinary text', () => {
    /** Embeds Kibana Workflow interpolation syntax beside Code Intelligence tokens. */
    const workflowText = {
      ...template,
      query: 'FROM [[source]] | WHERE note == "{{workflow}}" | LIMIT [[count]]',
      parameters: { source: template.parameters.source, count: template.parameters.count },
    };
    expect(queryTemplateRt.decode(workflowText)._tag).toBe('Right');
    expect(renderQueryTemplate(workflowText).query).toContain('"{{workflow}}"');
  });

  it('renders repeated reserved tokens at every query location', () => {
    /** Reuses field and message tokens to verify every recognized occurrence is replaced. */
    const repeated = {
      ...template,
      query:
        'FROM [[source]] | WHERE MATCH_PHRASE([[field]], [[message]]) AND MATCH_PHRASE([[field]], [[message]]) | LIMIT [[count]]',
      parameters: {
        source: template.parameters.source,
        field: template.parameters.field,
        message: template.parameters.message,
        count: template.parameters.count,
      },
    };
    expect(queryTemplateRt.decode(repeated)._tag).toBe('Right');
    expect(renderQueryTemplate(repeated).query).toContain(
      'MATCH_PHRASE(`event.name`, "say \\"hi\\"") AND MATCH_PHRASE(`event.name`, "say \\"hi\\"")'
    );
  });

  it('preserves reserved-token-looking source text inside a rendered string parameter', () => {
    expect(
      renderQueryTemplate({
        ...template,
        parameters: {
          ...template.parameters,
          message: { ...template.parameters.message, example: '[[tenant]]' },
        },
      }).query
    ).toContain('"[[tenant]]"');
  });

  it.each([
    [
      'undeclared token',
      { ...template, query: 'FROM [[source]] | WHERE [[missing]] == 1 | LIMIT [[count]]' },
    ],
    ['unused parameter', { ...template, query: 'FROM [[source]]' }],
    ['malformed open token', { ...template, query: 'FROM [[source' }],
    ['malformed close token', { ...template, query: 'FROM [[source]]]]' }],
    ['nested token', { ...template, query: 'FROM [[[[source]]]]' }],
  ])('rejects %s', (_name, invalidTemplate) => {
    expect(queryTemplateRt.decode(invalidTemplate)._tag).toBe('Left');
  });
});
