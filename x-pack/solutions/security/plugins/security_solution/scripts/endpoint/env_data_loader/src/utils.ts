/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loop = (count: number, callback: (instance: number) => any): void => {
  let done = 1;

  while (done <= count) {
    try {
      callback(done++);
    } catch {
      return;
    }
  }
};
