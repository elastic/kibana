/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export async function expectToReject<T extends Error>(fn: () => Promise<any>): Promise<T> {
  let res: any;
  try {
    res = await fn();
  } catch (e) {
    return e;
  }

  throw new Error(`expectToReject resolved: "${JSON.stringify(res)}"`);
}
