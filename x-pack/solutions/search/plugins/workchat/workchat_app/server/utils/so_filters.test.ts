/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBuilder } from './so_filters';

describe('createBuilder', () => {
  const soType = 'testType';

  it('generates expected value for top level `equals`', () => {
    const builder = createBuilder(soType);
    const filter = builder.equals('foo', 'bar').toKQL();
    expect(filter).toEqual('testType.attributes.foo: bar');
  });

  it('generates expected value for top level `and`', () => {
    const builder = createBuilder(soType);
    const filter = builder
      .and(builder.equals('foo', 'bar'), builder.equals('hello', 'dolly'))
      .toKQL();
    expect(filter).toEqual('(testType.attributes.foo: bar) AND (testType.attributes.hello: dolly)');
  });

  it('generates expected value for top level `or`', () => {
    const builder = createBuilder(soType);
    const filter = builder
      .or(builder.equals('foo', 'bar'), builder.equals('hello', 'dolly'))
      .toKQL();
    expect(filter).toEqual('(testType.attributes.foo: bar) OR (testType.attributes.hello: dolly)');
  });

  it('generates expected value for nested `and`/`or`', () => {
    const builder = createBuilder(soType);
    const filter = builder
      .and(
        builder.equals('hello', 'dolly'),
        builder.or(builder.equals('foo', 'bar'), builder.equals('fuz', 'baz'))
      )
      .toKQL();
    expect(filter).toEqual(
      '(testType.attributes.hello: dolly) AND ((testType.attributes.foo: bar) OR (testType.attributes.fuz: baz))'
    );
  });
});
