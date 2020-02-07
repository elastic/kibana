/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Fs from 'fs';
import semver from 'semver';

interface PackageJson {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  [key: string]: unknown;
}

const PKG_PATH = require.resolve('../../package.json');
export const PKG: PackageJson = JSON.parse(Fs.readFileSync(PKG_PATH, 'utf8'));
export const PKG_VERSION = PKG.version;
export const PKG_NAME = PKG.name;

if (!PKG_VERSION) {
  throw new Error('No "version" found in package.json');
}

if (!PKG_NAME) {
  throw new Error('No "name" found in package.json');
}

if (!semver.valid(PKG_VERSION)) {
  throw new Error(`Version is not valid semver: ${PKG_VERSION}`);
}
