/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function compareByFieldName(a: { fieldName: string }, b: { fieldName: string }) {
  if (a.fieldName < b.fieldName) {
    return -1;
  }
  if (a.fieldName > b.fieldName) {
    return 1;
  }
  return 0;
}

export function compareById(a: { id: string }, b: { id: string }) {
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }
  return 0;
}

export function compareByJobId(a: { jobId: string }, b: { jobId: string }) {
  if (a.jobId < b.jobId) {
    return -1;
  }
  if (a.jobId > b.jobId) {
    return 1;
  }
  return 0;
}
