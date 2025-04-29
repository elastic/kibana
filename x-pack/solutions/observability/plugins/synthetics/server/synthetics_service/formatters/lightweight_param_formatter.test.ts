/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ParsedVars, replaceVarsWithParams } from './lightweight_param_formatter';
import variableParser from './variable_parser';

const params = {
  splice: 'value',
  reference: 'abc',
  nested: 'value',
  this: 'value',
  HOME: '/user/shahzad',
};

describe('LightweightParamFormatter', () => {
  it('should return null if no params are passed', () => {
    const expected: ParsedVars = [
      { content: 'test ', type: 'nonvar' },
      { content: { default: null, name: 'splice' }, type: 'var' },
      { content: ' this', type: 'nonvar' },
    ];
    const formatter = variableParser.parse('test ${splice} this');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('test value this');
  });
  it('plain string', () => {
    const expected: ParsedVars = [{ content: 'string', type: 'nonvar' }];
    const formatter = variableParser.parse('string');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('string');
  });
  it('string containing :', () => {
    const expected: ParsedVars = [{ content: 'just:a:string', type: 'nonvar' }];
    const formatter = variableParser.parse('just:a:string');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('just:a:string');
  });
  it('string containing }', () => {
    const expected: ParsedVars = [{ content: 'abc } def', type: 'nonvar' }];
    const formatter = variableParser.parse('abc } def');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('abc } def');
  });
  it('string containing regex with $', () => {
    const expected: ParsedVars = [{ content: 'log$,|,l,e,g,$', type: 'nonvar' }];
    const formatter = variableParser.parse('log$|leg$');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('log$,|,l,e,g,$');
  });
  it('string with escaped var', () => {
    const expected: ParsedVars = [{ content: 'escaped $,${var}', type: 'nonvar' }];
    const formatter = variableParser.parse('escaped $${var}');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('escaped $,${var}');
  });
  it('works with simple variable', () => {
    const expected: ParsedVars = [{ content: { default: null, name: 'reference' }, type: 'var' }];
    const formatter = variableParser.parse('${reference}');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('abc');
  });
  it('exp at beginning', () => {
    const formatter = variableParser.parse('${splice} test');
    expect(formatter).toEqual([
      { content: { default: null, name: 'splice' }, type: 'var' },
      { content: ' test', type: 'nonvar' },
    ]);
  });
  it('exp at end', () => {
    const expected: ParsedVars = [
      { content: 'test ', type: 'nonvar' },
      { content: { default: null, name: 'this' }, type: 'var' },
    ];

    const formatter = variableParser.parse('test ${this}');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('test value');
  });

  it('exp with default', () => {
    const expected: ParsedVars = [{ content: { default: 'default', name: 'test' }, type: 'var' }];

    const formatter = variableParser.parse('${test:default}');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('default');
  });

  it('exp with default which has value', () => {
    const expected: ParsedVars = [{ content: { default: 'default', name: 'splice' }, type: 'var' }];

    const formatter = variableParser.parse('${splice:default}');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('value');
  });
  it('exp with default exp', () => {
    const formatter = variableParser.parse('${test:the ${default} value}', params);
    expect(formatter).toEqual([
      {
        content: {
          default: 'the ${default',
          name: 'test',
        },
        type: 'var',
      },
      {
        content: ' value}',
        type: 'nonvar',
      },
    ]);
  });
  it('exp with default containing }', () => {
    const formatter = variableParser.parse('${test:abc$}def}');
    expect(formatter).toEqual([
      { content: { default: 'abc$', name: 'test' }, type: 'var' },
      { content: 'def}', type: 'nonvar' },
    ]);
  });
  it.skip('exp with default containing } escaped', () => {
    const formatter = variableParser.parse('${test:abc$\\}def}', params);
    expect(formatter).toEqual([
      {
        content: {
          default: 'abc}def',
          name: 'test',
        },
        type: 'var',
      },
    ]);
  });
  it('exp with default containing :', () => {
    const expected: ParsedVars = [
      { content: { default: 'https://default:1234', name: 'test' }, type: 'var' },
    ];

    const formatter = variableParser.parse('${test:https://default:1234}');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('https://default:1234');
  });
  it('wraps content name when no default', () => {
    const result = replaceVarsWithParams(
      [{ type: 'var', content: { name: 'missing', default: null } }],
      {}
    );
    expect(result).toEqual('${missing}');
  });
});
