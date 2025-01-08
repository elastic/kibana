/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isFieldsSameType(fields: string[]): boolean {
  if (fields.length === 0) {
    return false;
  }
  const referenceType = fields[0].slice(fields[0].lastIndexOf('.') + 1);
  for (let i = 1; i < fields.length; i++) {
    const type = fields[i].slice(fields[i].lastIndexOf('.') + 1);
    if (type !== referenceType) {
      return false;
    }
  }
  return true;
}
