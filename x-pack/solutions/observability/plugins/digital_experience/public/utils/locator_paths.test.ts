/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DigitalExperienceLocatorDefinition } from '../../common/locator';
import { APPLICATION_TAB_IDS, type ApplicationTabId } from '../../common/types/applications';
import { digitalExperienceRouter } from '../routes';

/**
 * The locator builds the paths by hand, as it runs on the server, which has no router. What it
 * builds has to be what the router writes for the same page, or a stored link opens another one.
 * Every tab has to be listed here, so a tab that is added cannot go unchecked.
 */
const routerLinks: Record<ApplicationTabId, (serviceName: string) => string> = {
  overview: (serviceName) =>
    digitalExperienceRouter.link('/{serviceName}', {
      path: { serviceName },
      query: { source: 'otel' },
    }),
  errors: (serviceName) =>
    digitalExperienceRouter.link('/{serviceName}/errors', {
      path: { serviceName },
      query: { source: 'otel' },
    }),
  network: (serviceName) =>
    digitalExperienceRouter.link('/{serviceName}/network', {
      path: { serviceName },
      query: { source: 'otel' },
    }),
  sessions: (serviceName) =>
    digitalExperienceRouter.link('/{serviceName}/sessions', {
      path: { serviceName },
      query: { source: 'otel' },
    }),
};

describe('the paths of the locator', () => {
  const locator = new DigitalExperienceLocatorDefinition();

  it.each(APPLICATION_TAB_IDS)('are the router’s for the %s tab', async (tab) => {
    // A name that has to be escaped, which both have to do alike.
    const serviceName = 'my shop/web';

    const { path } = await locator.getLocation({ serviceName, tab, source: 'otel' });

    expect(path).toBe(routerLinks[tab](serviceName));
  });

  it('are the router’s for the list of applications', async () => {
    const { path } = await locator.getLocation({});

    expect(path).toBe(digitalExperienceRouter.link('/', { query: {} }));
  });
});
