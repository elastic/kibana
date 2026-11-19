/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { SearchGettingStartedPlugin } from './plugin';

describe('SearchGettingStartedPlugin', () => {
  const setupPlugin = () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    new SearchGettingStartedPlugin().setup(coreSetup, {});
    const [[app]] = coreSetup.application.register.mock.calls;

    return { app, coreStart };
  };

  it('keeps its URL but is listed in no navigation or global search', () => {
    const { app } = setupPlugin();

    expect(app).toMatchObject({
      id: 'searchGettingStarted',
      appRoute: '/app/elasticsearch/getting_started',
      visibleIn: [],
    });
  });

  it('replaces itself with the Elasticsearch home when opened', async () => {
    const { app, coreStart } = setupPlugin();
    const element = document.createElement('div');

    const unmount = await app.mount({
      ...coreMock.createAppMountParameters(),
      element,
      history: scopedHistoryMock.create(),
    });

    expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('searchHomepage', {
      replace: true,
    });
    expect(element).toBeEmptyDOMElement();
    expect(unmount).toEqual(expect.any(Function));
  });
});
