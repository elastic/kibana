/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function truncate(text: string, length: number) {
  return `${text.substring(0, length)}…`;
}

export function truncateBeginning(text: string, length: number) {
  return `…${text.substring(text.length - length)}`;
}
