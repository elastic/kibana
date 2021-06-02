/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import Path from 'path';

export const buildDir = Path.resolve(__dirname, '../../build');
export const buildTarget = Path.resolve(buildDir, 'plugin');
export const packageDir = Path.resolve(buildDir, 'distributions');
export const coverageDir = Path.resolve(__dirname, '../../coverage');
