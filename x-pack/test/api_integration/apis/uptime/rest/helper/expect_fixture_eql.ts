/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import { join } from 'path';
import { cloneDeep, isEqual } from 'lodash';

const fixturesDir = join(__dirname, '..', 'fixtures');

const excludeFieldsFrom = (from: any, excluder?: (d: any) => any): any => {
  const clone = cloneDeep(from);
  if (excluder) {
    excluder(clone);
  }
  return clone;
};

export const expectFixtureEql = <T>(data: T, fixtureName: string, excluder?: (d: T) => void) => {
  expect(data).not.to.eql(null);
  expect(data).not.to.eql(undefined);

  const fixturePath = join(fixturesDir, `${fixtureName}.json`);

  excluder = excluder || ((d) => d);
  const dataExcluded = excludeFieldsFrom(data, excluder);
  expect(dataExcluded).not.to.be(undefined);
  const fixtureExists = () => fs.existsSync(dataExcluded);
  const fixtureChanged = () =>
    !isEqual(
      dataExcluded,
      excludeFieldsFrom(JSON.parse(fs.readFileSync(fixturePath, 'utf8')), excluder)
    );
  if (process.env.UPDATE_UPTIME_FIXTURES && (!fixtureExists() || fixtureChanged())) {
    // Check if the data has changed. We can't simply write it because the order of attributes
    // can change leading to different bytes on disk, which we don't care about
    fs.writeFileSync(fixturePath, JSON.stringify(dataExcluded, null, 2));
  }
  const fileContents = fs.readFileSync(fixturePath, 'utf8');
  const fixture = JSON.parse(fileContents);
  expect(dataExcluded).to.eql(excludeFieldsFrom(fixture, excluder));
};
