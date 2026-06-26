/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { ObservabilityOnboardingAppServices } from '../../../..';

export const buildFetchError = (
  message = 'boom',
  status = 500
): IHttpFetchError<ResponseErrorBody> =>
  Object.assign(new Error(message), {
    name: 'HttpFetchError',
    req: {} as Request,
    request: {} as Request,
    response: { status, statusText: message, url: '/test' } as Response,
    body: { message, statusCode: status } as ResponseErrorBody,
  }) as IHttpFetchError<ResponseErrorBody>;

export const buildHostPageServices = (): ObservabilityOnboardingAppServices => {
  const coreStart = coreMock.createStart();
  return {
    ...coreStart,
    share: sharePluginMock.createStartContract(),
    context: {
      isDev: false,
      isCloud: false,
      isServerless: false,
      stackVersion: '9.0.0',
    },
    config: {
      ui: { enabled: true },
      serverless: { enabled: false },
    },
    observability: {
      config: {
        unsafe: {
          alertDetails: {
            uptime: { enabled: false },
          },
        },
        managedOtlpServiceUrl: '',
      },
      observabilityRuleTypeRegistry: {
        register: jest.fn(),
        getFormatter: jest.fn(() => undefined),
        list: jest.fn(() => []),
      },
      useRulesLink: jest.fn(() => ({ href: '/' })),
    } as ObservabilityPublicStart,
  };
};

interface RenderWithHostPageProvidersOptions {
  initialEntries?: string[];
  services?: ObservabilityOnboardingAppServices;
}

export const renderWithHostPageProviders = (
  ui: React.ReactElement,
  { initialEntries = ['/'], services }: RenderWithHostPageProvidersOptions = {}
) => {
  const resolvedServices = services ?? buildHostPageServices();
  return render(
    <I18nProvider>
      <KibanaContextProvider services={resolvedServices}>
        <MemoryRouter initialEntries={initialEntries}>
          <CompatRouter>{ui}</CompatRouter>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
