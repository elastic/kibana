/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import dotEnv from 'dotenv';
import testsList from './tests_list';
import { fromNullable } from '../../../../src/dev/code_coverage/ingest_coverage/either';

// envObj :: path -> {}
const envObj = (path) => dotEnv.config({ path });

const maybeUseExternalList = (obj) =>
  fromNullable(obj.TESTS_LIST).fold(
    () => ({ tests: testsList(obj), ...obj }), // Define in this repo
    (tests) => ({ tests, ...obj }) // Use defs from external repo
  );

// default fn :: path -> {}
export default (path) => maybeUseExternalList(envObj(path).parsed);
