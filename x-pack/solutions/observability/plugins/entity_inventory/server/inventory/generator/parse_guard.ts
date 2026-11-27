/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';

/**
 * Throws a plain `Error` with the parser's first message and the text when generated ES|QL does
 * not parse; a failure here is a generator bug, not an author error.
 */
export const assertParses = (esql: string): void => {
  const { errors } = Parser.parse(esql);
  if (errors.length > 0) {
    throw new Error(`generated ES|QL does not parse: ${errors[0].message}\n${esql}`);
  }
};
