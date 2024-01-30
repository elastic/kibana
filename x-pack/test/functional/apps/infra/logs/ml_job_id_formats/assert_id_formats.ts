/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IdFormat } from '@kbn/infra-plugin/common/http_api/latest';

const rateHashedPattern = /logs-[0-9a-fA-F]{32,}-log-entry-rate/;
const rateLegacyPattern = /kibana-logs-ui-.*-.*-log-entry-rate/;
const categoriesCountHashedPattern = /logs-[0-9a-fA-F]{32,}-log-entry-categories-count/;
const categoriesCountLegacyPattern = /kibana-logs-ui-.*-.*-log-entry-categories-count/;

export function assertIdFormats(
  url: string,
  expected: {
    'log-entry-rate': IdFormat | undefined;
    'log-entry-categories-count': IdFormat | undefined;
  }
) {
  const idFormats = extractIdFormats(url);
  expect(idFormats).to.eql(expected);
}

function extractIdFormats(url: string) {
  let rateFormat;
  if (rateHashedPattern.test(url)) {
    rateFormat = 'hashed';
  } else if (rateLegacyPattern.test(url)) {
    rateFormat = 'legacy';
  }

  let categoriesCountFormat;
  if (categoriesCountHashedPattern.test(url)) {
    categoriesCountFormat = 'hashed';
  } else if (categoriesCountLegacyPattern.test(url)) {
    categoriesCountFormat = 'legacy';
  }

  return {
    'log-entry-rate': rateFormat,
    'log-entry-categories-count': categoriesCountFormat,
  };
}
