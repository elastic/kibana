/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AbsoluteTimeRange {
  from: string;
  to: string;
}

/** Builds the rison value of the Security `timerange` URL param for an absolute range. */
export const toTimerangeParam = ({ from, to }: AbsoluteTimeRange): string => {
  const range = `(from:'${from}',kind:absolute,to:'${to}')`;
  return `(global:(linkTo:!(timeline),timerange:${range}),timeline:(linkTo:!(global),timerange:${range}))`;
};
