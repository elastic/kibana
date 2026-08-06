/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render as rtlRender } from '@testing-library/react';
import { render } from '../../../utils/testing';
import { WrappedPageTemplate } from './synthetics_page_template';
import type { ClientPluginsStart } from '../../../../../plugin';

describe('WrappedPageTemplate', () => {
  const inPageBreadcrumbs = [{ text: 'Monitors', href: '/app/synthetics/monitors' }];

  const renderTemplate = ({
    chromeStyle,
    isNextChromeEnabled,
  }: {
    chromeStyle: ChromeStyle;
    isNextChromeEnabled: boolean;
  }) => {
    const defaultChrome = coreMock.createStart().chrome;
    const receivedPageHeaders: Array<EuiPageHeaderProps | undefined> = [];

    const PageTemplate = ({ pageHeader }: { pageHeader?: EuiPageHeaderProps }) => {
      receivedPageHeaders.push(pageHeader);
      return null;
    };

    render<Pick<ClientPluginsStart, 'observabilityShared'>>(
      <WrappedPageTemplate
        pageHeader={{ pageTitle: 'Monitor name', breadcrumbs: inPageBreadcrumbs }}
      />,
      {
        core: {
          chrome: {
            ...defaultChrome,
            getChromeStyle: () => chromeStyle,
            getChromeStyle$: () => new BehaviorSubject<ChromeStyle>(chromeStyle).asObservable(),
            next: { ...defaultChrome.next, isEnabled: isNextChromeEnabled },
          },
          observabilityShared: { navigation: { PageTemplate } },
        },
      }
    );

    return receivedPageHeaders;
  };

  it('keeps the in-page breadcrumbs in classic chrome', () => {
    const pageHeaders = renderTemplate({ chromeStyle: 'classic', isNextChromeEnabled: false });

    expect(pageHeaders.at(-1)?.breadcrumbs).toEqual(inPageBreadcrumbs);
  });

  it('keeps the in-page breadcrumbs in solution view while the new chrome is disabled', () => {
    const pageHeaders = renderTemplate({ chromeStyle: 'project', isNextChromeEnabled: false });

    expect(pageHeaders.at(-1)?.breadcrumbs).toEqual(inPageBreadcrumbs);
  });

  it('drops the in-page breadcrumbs when the new chrome header renders its own back button', () => {
    const pageHeaders = renderTemplate({ chromeStyle: 'project', isNextChromeEnabled: true });

    expect(pageHeaders.at(-1)?.breadcrumbs).toBeUndefined();
    expect(pageHeaders.at(-1)?.pageTitle).toEqual('Monitor name');
  });

  it('drops the in-page breadcrumbs on the very first render', () => {
    const pageHeaders = renderTemplate({ chromeStyle: 'project', isNextChromeEnabled: true });

    expect(pageHeaders[0]?.breadcrumbs).toBeUndefined();
  });

  it('keeps the in-page breadcrumbs when chrome is missing from services', () => {
    const receivedPageHeaders: Array<EuiPageHeaderProps | undefined> = [];
    const PageTemplate = ({ pageHeader }: { pageHeader?: EuiPageHeaderProps }) => {
      receivedPageHeaders.push(pageHeader);
      return null;
    };

    rtlRender(
      <KibanaContextProvider services={{ observabilityShared: { navigation: { PageTemplate } } }}>
        <WrappedPageTemplate
          pageHeader={{ pageTitle: 'Monitor name', breadcrumbs: inPageBreadcrumbs }}
        />
      </KibanaContextProvider>
    );

    expect(receivedPageHeaders.at(-1)?.breadcrumbs).toEqual(inPageBreadcrumbs);
  });
});
