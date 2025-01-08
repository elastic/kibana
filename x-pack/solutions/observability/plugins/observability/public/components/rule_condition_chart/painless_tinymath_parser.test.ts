/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PainlessTinyMathParser } from './painless_tinymath_parser';

describe('PainlessTinyMathParser', () => {
  it('should parse a simple equation without aggregations A-Z ', () => {
    const equation = '1 + 1';
    const parser = new PainlessTinyMathParser({ equation });
    expect(parser.parse()).toEqual('1+1');
  });
  it('should parse a simple equation with one aggregations A', () => {
    const equation = '100 * A';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual('100*average(system.cpu.system.pct)');
  });
  it('should parse a simple equation with multi-char aggregation name', () => {
    const equation = '100 * ABC-abc';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        'ABC-abc': {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
      },
    });
    expect(parser.parse()).toEqual('100*average(system.cpu.system.pct)');
  });
  it('should parse a simple equation with two aggregations A and B', () => {
    const equation = '100 * A + B / 100';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      '100*average(system.cpu.system.pct)+average(system.cpu.user.pct)/100'
    );
  });
  it('should parse an equation with three aggregations A, B and C with parentheses', () => {
    const equation = '100 * (A + B / 100) - C';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
        C: {
          operationWithField: 'average(system.cpu.cores)',
          operation: 'average',
          sourceField: 'system.cpu.cores',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      '100*(average(system.cpu.system.pct)+average(system.cpu.user.pct)/100)-average(system.cpu.cores)'
    );
  });
  it('should parse an equation with one condition', () => {
    const equation = 'A > 0 ? 10 : 20';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual('ifelse(average(system.cpu.system.pct)>0, 10, 20)');
  });

  it('should parse an equation with two condition one of them is a single chart', () => {
    const equation = 'A > B || A ? 20 : 30';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)>average(system.cpu.user.pct),1,0) + ifelse(average(system.cpu.system.pct) > 0,1,0) > 0, 20, 30)'
    );
  });
  it('should parse an equation with one condition that when TRUE is a condition', () => {
    const equation = 'A > 0 ? B > 0 ? 10 : 20 : 30';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(average(system.cpu.system.pct)>0, ifelse(average(system.cpu.user.pct)>0, 10, 20), 30)'
    );
  });
  it('should parse an equation with two condition with OR', () => {
    const equation = 'A > 0 || B > 10 ? 100 : 30';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)>0,1,0) + ifelse(average(system.cpu.user.pct)>10,1,0) > 0, 100, 30)'
    );
  });
  it('should parse an equation with two condition with AND', () => {
    const equation = 'A > 0 && B > 10 ? 100 : 30';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)>0,1,0) * ifelse(average(system.cpu.user.pct)>10,1,0) > 0, 100, 30)'
    );
  });
  it('should parse an equation with two condition with OR and NOT with parentheses', () => {
    const equation = '!(A > 0) || B == 10 ? 100 : 30';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)>0,0,1) + ifelse(average(system.cpu.user.pct)==10,1,0) > 0, 100, 30)'
    );
  });
  it('should parse an equation with three conditions with mix of OR and AND with parentheses', () => {
    const equation = '(A > 0 || B == 10) && A < 200 ? 100 : 30';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)>0,1,0) + ifelse(average(system.cpu.user.pct)==10,1,0) * ifelse(average(system.cpu.system.pct)<200,1,0) > 0, 100, 30)'
    );
  });
  it('should parse an equation with four conditions with mix of OR and AND with NOT and NOT EQUAL and parentheses where FALSE is a condition', () => {
    const equation = '!(A > 0) || B !== 10 && !(A < 200 || B == 2) ? 100 : A == 10 ? 200 : 300';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)>0,0,1) + ifelse(average(system.cpu.user.pct)==10,0,1) * ifelse(average(system.cpu.system.pct)<200,0,1) + ifelse(average(system.cpu.user.pct)==2,1,0) > 0, 100, ifelse(average(system.cpu.system.pct)==10, 200, 300))'
    );
  });
  it('should parse a complex equation with multi char aggregation name', () => {
    const equation =
      '!(aa > 0) || baa !== 10 && !(aa < 200 || baa == 2) ? 100 : aa == 10 ? 200 : 300';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        aa: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        baa: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
      },
    });
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)>0,0,1) + ifelse(average(system.cpu.user.pct)==10,0,1) * ifelse(average(system.cpu.system.pct)<200,0,1) + ifelse(average(system.cpu.user.pct)==2,1,0) > 0, 100, ifelse(average(system.cpu.system.pct)==10, 200, 300))'
    );
  });

  it('should parse a complex equation with many nested conditions and many aggregations', () => {
    const equation =
      'A == 10 && F == 10 ? B == 20 ? C < 200 ? D > 200 ? 300 : A - D : B/C : 20 : A * C > C * D ? (A+B)/C > 100 ? D !== 20 ? 200 : 100 : 200 : B/C';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
        C: {
          operationWithField: 'average(system.cpu.total.pct)',
          operation: 'average',
          sourceField: 'system.cpu.total.pct',
        },
        D: {
          operationWithField: 'average(system.cpu.cores)',
          operation: 'average',
          sourceField: 'system.cpu.cores',
        },
        E: {
          operationWithField: 'count()',
          operation: 'count',
          sourceField: '',
        },
        F: {
          operationWithField: 'sum(system.cpu.total.pct)',
          operation: 'sum',
          sourceField: 'system.cpu.total.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)==10,1,0) * ifelse(sum(system.cpu.total.pct)==10,1,0) > 0, ifelse(average(system.cpu.user.pct)==20, ifelse(average(system.cpu.total.pct)<200, ifelse(average(system.cpu.cores)>200, 300, average(system.cpu.system.pct)-average(system.cpu.cores)), average(system.cpu.user.pct)/average(system.cpu.total.pct)), 20), ifelse(average(system.cpu.system.pct)*average(system.cpu.total.pct)>average(system.cpu.total.pct)*average(system.cpu.cores), ifelse((average(system.cpu.system.pct)+average(system.cpu.user.pct))/average(system.cpu.total.pct)>100, ifelse(ifelse(average(system.cpu.cores)==20,0,1) > 0, 200, 100), 200), average(system.cpu.user.pct)/average(system.cpu.total.pct)))'
    );
  });

  it('should parse a complex equation with deeply nested conditions and many aggregations with parentheses', () => {
    const equation =
      'A == 10 && (F == 10 || (B > 20 && B ==20) || D > 20) ? B == 20 ? C < 200 ? D > 200 ? 300 : A - D : B/C : 20 : A * C > C * D ? (A+B)/C > 100 ? D !== 20 ? 200 : 100 : 200 : B/C';
    const parser = new PainlessTinyMathParser({
      equation,
      aggMap: {
        A: {
          operationWithField: 'average(system.cpu.system.pct)',
          operation: 'average',
          sourceField: 'system.cpu.system.pct',
        },
        B: {
          operationWithField: 'average(system.cpu.user.pct)',
          operation: 'average',
          sourceField: 'system.cpu.user.pct',
        },
        C: {
          operationWithField: 'average(system.cpu.total.pct)',
          operation: 'average',
          sourceField: 'system.cpu.total.pct',
        },
        D: {
          operationWithField: 'average(system.cpu.cores)',
          operation: 'average',
          sourceField: 'system.cpu.cores',
        },
        E: {
          operationWithField: 'count()',
          operation: 'count',
          sourceField: '',
        },
        F: {
          operationWithField: 'sum(system.cpu.total.pct)',
          operation: 'sum',
          sourceField: 'system.cpu.total.pct',
        },
      },
    });
    // ✅ checked with Lens Formula editor
    expect(parser.parse()).toEqual(
      'ifelse(ifelse(average(system.cpu.system.pct)==10,1,0) * ifelse(sum(system.cpu.total.pct)==10,1,0) + ifelse(average(system.cpu.user.pct)>20,1,0) * ifelse(average(system.cpu.user.pct)==20,1,0) + ifelse(average(system.cpu.cores)>20,1,0) > 0, ifelse(average(system.cpu.user.pct)==20, ifelse(average(system.cpu.total.pct)<200, ifelse(average(system.cpu.cores)>200, 300, average(system.cpu.system.pct)-average(system.cpu.cores)), average(system.cpu.user.pct)/average(system.cpu.total.pct)), 20), ifelse(average(system.cpu.system.pct)*average(system.cpu.total.pct)>average(system.cpu.total.pct)*average(system.cpu.cores), ifelse((average(system.cpu.system.pct)+average(system.cpu.user.pct))/average(system.cpu.total.pct)>100, ifelse(ifelse(average(system.cpu.cores)==20,0,1) > 0, 200, 100), 200), average(system.cpu.user.pct)/average(system.cpu.total.pct)))'
    );
  });
});
