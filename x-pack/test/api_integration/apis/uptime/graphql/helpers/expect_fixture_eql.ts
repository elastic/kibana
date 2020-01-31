/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import { join } from 'path';
import { cloneDeep } from 'lodash';

const fixturesDir = join(__dirname, '..', 'fixtures');
const restFixturesDir = join(__dirname, '../../rest/', 'fixtures');

const excludeFieldsFrom = (from: any, excluder?: (d: any) => any): any => {
  const clone = cloneDeep(from);
  if (excluder) {
    excluder(clone);
  }
  return clone;
};

export const expectFixtureEql = <T>(data: T, fixtureName: string, excluder?: (d: T) => void) => {
  let fixturePath = join(fixturesDir, `${fixtureName}.json`);
  if (!fs.existsSync(fixturePath)) {
    fixturePath = join(restFixturesDir, `${fixtureName}.json`);
  }

  const dataExcluded = excludeFieldsFrom(data, excluder);
  expect(dataExcluded).not.to.be(undefined);
  if (process.env.UPDATE_UPTIME_FIXTURES) {
    fs.writeFileSync(fixturePath, JSON.stringify(dataExcluded, null, 2));
  }
  const fileContents = fs.readFileSync(fixturePath, 'utf8');
  const fixture = JSON.parse(fileContents);
  expect(dataExcluded).to.eql(excludeFieldsFrom(fixture, excluder));
};
