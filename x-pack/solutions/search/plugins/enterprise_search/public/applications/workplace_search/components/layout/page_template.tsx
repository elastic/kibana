/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';
import useObservable from 'react-use/lib/useObservable';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { KibanaLogic } from '../../../shared/kibana';
import { SetWorkplaceSearchChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { SendWorkplaceSearchTelemetry } from '../../../shared/telemetry';

import { useWorkplaceSearchNav } from './nav';

export const WorkplaceSearchPageTemplate: React.FC<PageTemplateProps> = ({
  children,
  pageChrome,
  pageViewTelemetry,
  ...pageTemplateProps
}) => {
  const navItems = useWorkplaceSearchNav();
  const { getChromeStyle$ } = useValues(KibanaLogic);
  const chromeStyle = useObservable(getChromeStyle$(), 'classic');

  return (
    <EnterpriseSearchPageTemplateWrapper
      restrictWidth
      {...pageTemplateProps}
      solutionNav={{
        items: chromeStyle === 'classic' ? navItems : undefined,
        name: WORKPLACE_SEARCH_PLUGIN.NAME,
      }}
      setPageChrome={pageChrome && <SetWorkplaceSearchChrome trail={pageChrome} />}
      useEndpointHeaderActions={false}
      hideEmbeddedConsole
    >
      {pageViewTelemetry && (
        <SendWorkplaceSearchTelemetry action="viewed" metric={pageViewTelemetry} />
      )}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};
