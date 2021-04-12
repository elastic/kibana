/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PKG_VERSION } from './pkg';
import { FLAGS } from './flags';

const snapshotText = FLAGS.release ? '' : '-SNAPSHOT';
const qualifierText = FLAGS.buildQualifier ? '-' + FLAGS.buildQualifier : '';
export const BUILD_VERSION = `${PKG_VERSION}${qualifierText}${snapshotText}`;
