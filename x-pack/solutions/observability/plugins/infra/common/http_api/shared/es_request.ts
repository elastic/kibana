/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const scriptBaseRT = rt.partial({
  params: rt.record(rt.string, rt.any),
});

const inlineScriptRT = rt.intersection([
  scriptBaseRT,
  rt.partial({
    lang: rt.string,
    options: rt.record(rt.string, rt.string),
  }),
  rt.type({
    source: rt.string,
  }),
]);

const storedScriptIdRT = rt.intersection([
  scriptBaseRT,
  rt.type({
    id: rt.string,
  }),
]);

const scriptRT = rt.union([inlineScriptRT, rt.string, storedScriptIdRT]);

export const mappingRuntimeFieldTypeRT = rt.keyof({
  boolean: null,
  date: null,
  double: null,
  geo_point: null,
  ip: null,
  keyword: null,
  long: null,
});

export const mappingRuntimeFieldRT = rt.intersection([
  rt.partial({
    format: rt.string,
    script: scriptRT,
  }),
  rt.type({
    type: mappingRuntimeFieldTypeRT,
  }),
]);
