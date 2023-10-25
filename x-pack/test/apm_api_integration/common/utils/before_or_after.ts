/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Helper function to run a callback before or after a test
// depending on whether the --bail flag is passed.
// With --bail flag the callback is run before
// without --bail flag the callback is run after
// This makes it easier to debug tests when they fail because data are still available
export function beforeOrAfter(cb: () => Promise<unknown> | unknown) {
  if (process.argv.includes('--bail')) {
    before(cb);
  } else {
    after(cb);
  }
}
