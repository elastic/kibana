/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import dotEnv from 'dotenv';

const envObj = (path) => dotEnv.config({ path });

export default (path) => envObj(path).parsed;
