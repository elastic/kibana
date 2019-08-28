/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import { join } from 'path';
import { cloneDeep } from 'lodash';

const fixturesDir = join(__dirname, 'fixtures');

const excludeFieldsFrom = (from: any, excluder: (d: any) => any): any => {
  const clone = cloneDeep(from);
  excluder(clone);
  return clone;
};

export const expectFixtureEql = (data: any, fixtureName: string, excluder: (d: any) => any) => {
  const fixturePath = join(fixturesDir, `${fixtureName}.json`);
  if (process.env.UPDATE_UPTIME_FIXTURES) {
    fs.writeFileSync(fixturePath, JSON.stringify(data, null, 2));
  }
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  expect(excludeFieldsFrom(data, excluder)).to.eql(excludeFieldsFrom(fixture, excluder));
};
