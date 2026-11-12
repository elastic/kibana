/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEsqlQueryForSourceOrThrow, EsqlQueryValidationError } from './validate_esql_query';

jest.mock('@elastic/esql', () => {
  const actual = jest.requireActual('@elastic/esql');
  return {
    ...actual,
    Parser: {
      ...actual.Parser,
      parse: jest.fn(actual.Parser.parse),
    },
  };
});

describe('validateEsqlQueryForSourceOrThrow', () => {
  const viewName = '$.nightshift.sources.default.checkout';

  it('accepts a query whose only FROM source is the view', () => {
    expect(() =>
      validateEsqlQueryForSourceOrThrow({
        esqlQuery: `FROM ${viewName} | LIMIT 10`,
        viewName,
      })
    ).not.toThrow();
  });

  it('rejects a query that reads a different source', () => {
    expect(() =>
      validateEsqlQueryForSourceOrThrow({
        esqlQuery: 'FROM logs-* | LIMIT 10',
        viewName,
      })
    ).toThrow(`ES|QL query must use FROM ${viewName}`);
  });

  it('rejects a query without a FROM clause', () => {
    expect(() =>
      validateEsqlQueryForSourceOrThrow({
        esqlQuery: 'ROW a = 1',
        viewName,
      })
    ).toThrow('ES|QL query must contain a FROM clause');
  });

  it('rejects syntactically invalid ES|QL with a 400', () => {
    expect(() =>
      validateEsqlQueryForSourceOrThrow({ esqlQuery: '{{INVALID ESQL}}', viewName })
    ).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('reports a parser failure as an invalid query', () => {
    const { Parser } = jest.requireMock('@elastic/esql');
    (Parser.parse as jest.Mock).mockImplementationOnce(() => {
      throw new Error('parse failure');
    });

    expect(() => validateEsqlQueryForSourceOrThrow({ esqlQuery: 'anything', viewName })).toThrow(
      new EsqlQueryValidationError('Invalid ES|QL query: parse failure')
    );
  });

  it('fails closed on parser errors even when the view is present', () => {
    expect(() =>
      validateEsqlQueryForSourceOrThrow({
        esqlQuery: `FROM ${viewName} | WHERE message == "unterminated`,
        viewName,
      })
    ).toThrow('Invalid ES|QL query');
  });
});
