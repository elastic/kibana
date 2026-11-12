/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { Ordering } from './common';
export { compareKeys, UnencodableVersionError } from './common';
export type { DpkgVersion } from './dpkg';
export { compareDpkg, dpkgKey, parseDpkg } from './dpkg';
export type { Evr } from './rpm';
export { compareRpm, parseEvr, rpmKey, rpmvercmp } from './rpm';
