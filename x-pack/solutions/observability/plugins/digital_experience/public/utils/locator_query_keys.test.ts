/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DIGITAL_EXPERIENCE_LOCATOR_QUERY_KEYS } from '../../common/locator';
import { overviewQueryProps } from './overview_filters_query';
import { sessionsListQueryRt } from './sessions_list_query';

/**
 * The locator can only set the params it lists, so a param the pages gain has to be listed too, or
 * a link made with it opens the page without it.
 */
describe('the query keys of the locator', () => {
  const locatorKeys: readonly string[] = DIGITAL_EXPERIENCE_LOCATOR_QUERY_KEYS;

  it('include every param of the Overview and of the Sessions list', () => {
    expect(locatorKeys).toEqual(expect.arrayContaining(Object.keys(overviewQueryProps)));
    expect(locatorKeys).toEqual(expect.arrayContaining(Object.keys(sessionsListQueryRt.props)));
  });

  it('include the params of the root route and the source', () => {
    expect(locatorKeys).toEqual(
      expect.arrayContaining(['rangeFrom', 'rangeTo', 'environment', 'sourceFilter', 'source'])
    );
  });
});
