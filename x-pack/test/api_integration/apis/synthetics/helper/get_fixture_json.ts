/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { join } from 'path';

const fixturesDir = join(__dirname, '..', 'fixtures');

export function getFixtureJson(fixtureName: string) {
  try {
    const fixturePath = join(fixturesDir, `${fixtureName}.json`);
    const fileContents = fs.readFileSync(fixturePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (e) {
    return {};
  }
}
