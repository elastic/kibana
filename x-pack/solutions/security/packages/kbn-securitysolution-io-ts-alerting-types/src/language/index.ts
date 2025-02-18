/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const language = t.keyof({ eql: null, kuery: null, lucene: null, esql: null });
export type Language = t.TypeOf<typeof language>;

export const languageOrUndefined = t.union([language, t.undefined]);
export type LanguageOrUndefined = t.TypeOf<typeof languageOrUndefined>;
