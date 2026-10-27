/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Terms `include` takes a Lucene regular expression, so the prefix must be escaped. */
export const prefixToIncludePattern = (prefix: string): string =>
  `${prefix.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (char) => `\\${char}`)}.*`;
