/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';
import useObservable from 'react-use/lib/useObservable';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import { KibanaLogic } from '../../../shared/kibana';
import { SetAppSearchChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { SendAppSearchTelemetry } from '../../../shared/telemetry';

import { useAppSearchNav } from './nav';

export const AppSearchPageTemplate: React.FC<
  Omit<PageTemplateProps, 'useEndpointHeaderActions'>
> = ({ children, pageChrome, pageViewTelemetry, ...pageTemplateProps }) => {
  const navItems = useAppSearchNav();
  const { getChromeStyle$ } = useValues(KibanaLogic);
  const chromeStyle = useObservable(getChromeStyle$(), 'classic');

  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        name: APP_SEARCH_PLUGIN.NAME,
        items: chromeStyle === 'classic' ? navItems : undefined,
      }}
      setPageChrome={pageChrome && <SetAppSearchChrome trail={pageChrome} />}
      useEndpointHeaderActions={false}
      hideEmbeddedConsole
    >
      {pageViewTelemetry && <SendAppSearchTelemetry action="viewed" metric={pageViewTelemetry} />}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};
