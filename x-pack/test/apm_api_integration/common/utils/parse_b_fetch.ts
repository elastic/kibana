/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import request from 'superagent';

export function parseBfetchResponse(resp: request.Response): Array<Record<string, any>> {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => JSON.parse(item));
}
