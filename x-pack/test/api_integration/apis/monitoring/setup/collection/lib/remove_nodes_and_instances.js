/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// We are returning raw node/instance data from the detected products
// and those will vary from machine to machine (and aren't retrieved from the archive data)
// so we need to remove those for these tests to ensure we can get the tests passing everywhere
export function removeNodesAndInstances(obj) {
  return Object.entries(obj).reduce((accum, [key, value]) => {
    if (key === 'instance' || key === 'node') {
      accum[key] = {};
      return accum;
    }
    accum[key] = value && typeof value === 'object' ? removeNodesAndInstances(value) : value;
    return accum;
  }, {});
}
