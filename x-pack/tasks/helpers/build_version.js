/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yargs from 'yargs';
import semver from 'semver';

yargs
  .alias('r', 'release').describe('r', 'Create a release build, not a snapshot')
  .option('build-qualifier', {
    default: null
  });
const argv = yargs.argv;

export default function getVersion(pkg) {
  const { version } = pkg;
  if (!version) {
    throw new Error('No version found in package.json');
  }
  if (!semver.valid(version)) {
    throw new Error(`Version is not valid semver: ${version}`);
  }

  const snapshotText = (argv.release) ? '' : '-SNAPSHOT';
  const qualifierText = argv.buildQualifier ? '-' + argv.buildQualifier : '';
  return `${version}${qualifierText}${snapshotText}`;
}
