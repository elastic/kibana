/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import dotEnv from 'dotenv';
import testsList from './tests_list';

// envObj :: path -> {}
const envObj = (path) => dotEnv.config({ path });

// default fn :: path -> {}
export default (path) => {
  const obj = envObj(path).parsed;
  return { tests: testsList(obj), ...obj };
};
