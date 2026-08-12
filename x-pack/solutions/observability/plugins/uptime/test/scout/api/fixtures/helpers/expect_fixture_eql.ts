/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { join } from 'path';
import { cloneDeep, isEqual } from 'lodash';
import { expect } from '@kbn/scout-oblt/api';

const fixturesDir = join(__dirname, '..', 'responses');

const excludeFieldsFrom = (from: any, excluder?: (d: any) => any): any => {
  const clone = cloneDeep(from);
  if (excluder) {
    excluder(clone);
  }
  return clone;
};

export const stripInspect = (obj: any) => {
  const clone = cloneDeep(obj);
  if (clone && typeof clone === 'object' && '_inspect' in clone) {
    delete clone._inspect;
  }
  return clone;
};

export const expectFixtureEql = <T>(data: T, fixtureName: string, excluder?: (d: T) => void) => {
  expect(data).toBeDefined();

  const fixturePath = join(fixturesDir, `${fixtureName}.json`);

  excluder = excluder || ((d) => d);
  const dataExcluded = stripInspect(excludeFieldsFrom(data, excluder));
  expect(dataExcluded).toBeDefined();
  const fixtureExists = () => fs.existsSync(fixturePath);
  const fixtureChanged = () =>
    !isEqual(
      dataExcluded,
      excludeFieldsFrom(JSON.parse(fs.readFileSync(fixturePath, 'utf8')), excluder)
    );
  if (process.env.UPDATE_UPTIME_FIXTURES && (!fixtureExists() || fixtureChanged())) {
    fs.writeFileSync(fixturePath, JSON.stringify(dataExcluded, null, 2));
  }
  const fileContents = fs.readFileSync(fixturePath, 'utf8');
  const fixture = JSON.parse(fileContents);
  expect(dataExcluded).toStrictEqual(excludeFieldsFrom(fixture, excluder));
};
