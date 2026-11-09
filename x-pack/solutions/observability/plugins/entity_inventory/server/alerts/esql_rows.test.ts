/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertLiteralField, isLiteralField } from './esql_rows';

describe('isLiteralField', () => {
  it.each(['host.name', 'k8s.pod.uid', 'kibana.alert-1.a_b', '@timestamp', 'cluster'])(
    'accepts %s',
    (field) => expect(isLiteralField(field)).toBe(true)
  );

  it.each(['', 'a..b', '.a', 'a.', 'a b', 'a"b', 'a`b', 'a),b', 'a*', 'a/b'])(
    'rejects %p',
    (field) => expect(isLiteralField(field)).toBe(false)
  );

  it('throws for a field that is not literal', () => {
    expect(() => assertLiteralField('a"b')).toThrow('"a"b" is not a literal field path');
    expect(() => assertLiteralField('a.b')).not.toThrow();
  });
});
