/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import React, { useMemo } from 'react';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { ClientPluginsStart } from '../../../../../plugin';

export const WrappedPageTemplate = (props: LazyObservabilityPageTemplateProps) => {
  const { chrome, observabilityShared } = useKibana<ClientPluginsStart>().services;
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;

  const chromeStyle$ = useMemo(
    () => chrome?.getChromeStyle$() ?? of<ChromeStyle>('classic'),
    [chrome]
  );

  const chromeStyle = useObservable<ChromeStyle>(
    chromeStyle$,
    chrome?.getChromeStyle() ?? 'classic'
  );

  // The chrome header renders its own back button, so in-page breadcrumbs would duplicate it.
  const hasChromeBackButton = Boolean(chrome?.next?.isEnabled) && chromeStyle === 'project';
  const pageHeader =
    hasChromeBackButton && props.pageHeader
      ? { ...props.pageHeader, breadcrumbs: undefined }
      : props.pageHeader;

  return <PageTemplateComponent {...props} pageHeader={pageHeader} />;
};

export const SyntheticsPageTemplateComponent = euiStyled(WrappedPageTemplate)`
  &&& {
    .euiPageHeaderContent__top {
      flex-wrap: wrap;
      .euiTitle {
        min-width: 160px;
      }
    }
  }
`;
