/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRedirectToAfterEngineCreation } from './utils';

describe('getRedirectToAfterEngineCreation', () => {
  it('returns crawler path when ingestionMethod is crawler', () => {
    const engineName = 'elastic';
    const redirectTo = getRedirectToAfterEngineCreation({ ingestionMethod: 'crawler', engineName });
    expect(redirectTo).toEqual('/engines/elastic/crawler');
  });

  it('returns engine overview path when there is no ingestionMethod', () => {
    const engineName = 'elastic';
    const redirectTo = getRedirectToAfterEngineCreation({ ingestionMethod: '', engineName });
    expect(redirectTo).toEqual('/engines/elastic');
  });

  it('returns engine overview path with query param when there is ingestionMethod', () => {
    const engineName = 'elastic';
    const redirectTo = getRedirectToAfterEngineCreation({ ingestionMethod: 'api', engineName });
    expect(redirectTo).toEqual('/engines/elastic?method=api');
  });
});
