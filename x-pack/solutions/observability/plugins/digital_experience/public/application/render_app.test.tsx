/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM from 'react-dom';
import type { AppMountParameters } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DigitalExperienceStartDeps } from '../types';
import { renderApp } from './render_app';

jest.mock('react-dom', () => ({ render: jest.fn(), unmountComponentAtNode: jest.fn() }));

describe('renderApp', () => {
  it('clears the search session the embedded dashboard started when the app unmounts', () => {
    const data = dataPluginMock.createStartContract();
    const element = document.createElement('div');
    const unmount = renderApp({
      core: coreMock.createStart(),
      pluginsStart: {
        data,
        observabilityShared: { navigation: { PageTemplate: () => null } },
      } as unknown as DigitalExperienceStartDeps,
      appMountParameters: { element, history: {} } as unknown as AppMountParameters,
    });

    unmount();

    expect(data.search.session.clear).toHaveBeenCalledTimes(1);
    expect(ReactDOM.unmountComponentAtNode).toHaveBeenCalledWith(element);
  });
});
