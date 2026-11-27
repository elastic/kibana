/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { typeNameSchema } from './type_name_schema';

describe('typeNameSchema', () => {
  it.each(['host', 'k8s.pod', 'aws_s3-bucket', 'k8s.deployment', 'a'.repeat(64)])(
    'accepts %s',
    (type) => {
      expect(typeNameSchema.safeParse(type).success).toBe(true);
    }
  );

  it.each([
    ['empty', ''],
    ['over 64 characters', 'a'.repeat(65)],
    ['uppercase', 'K8s.pod'],
    ['a leading digit', '8s.pod'],
    ['a leading separator', '.pod'],
    ['a trailing separator', 'k8s.'],
    ['repeated separators', 'k8s..pod'],
    ['a space', 'k8s pod'],
  ])('rejects %s', (_label, type) => {
    expect(typeNameSchema.safeParse(type).success).toBe(false);
  });
});
