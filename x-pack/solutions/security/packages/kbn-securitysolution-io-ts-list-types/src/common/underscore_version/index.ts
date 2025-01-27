/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const _version = t.string;
export const _versionOrUndefined = t.union([_version, t.undefined]);
export type _VersionOrUndefined = t.TypeOf<typeof _versionOrUndefined>;
