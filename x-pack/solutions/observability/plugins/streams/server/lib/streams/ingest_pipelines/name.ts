/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getProcessingPipelineName(name: string) {
  return `${name}@stream.processing`;
}

export function getReroutePipelineName(name: string) {
  return `${name}@stream.reroutes`;
}
