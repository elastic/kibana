/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSection } from '@elastic/eui';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import React, { useMemo } from 'react';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { ClientPluginsStart } from '../../../../../plugin';

export type SyntheticsPageTemplateProps = LazyObservabilityPageTemplateProps & {
  header?: React.ReactNode;
};

export const WrappedPageTemplate = ({
  header,
  pageHeader,
  pageSectionProps,
  children,
  ...props
}: SyntheticsPageTemplateProps) => {
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
  const hasChromeBackButton = chromeStyle === 'project';
  const resolvedPageHeader =
    hasChromeBackButton && pageHeader ? { ...pageHeader, breadcrumbs: undefined } : pageHeader;

  const originalPadding = pageSectionProps?.paddingSize;
  const shouldPadBody = Boolean(header) && originalPadding !== 'none';

  return (
    <PageTemplateComponent
      {...props}
      pageHeader={resolvedPageHeader}
      pageSectionProps={header ? { ...pageSectionProps, paddingSize: 'none' } : pageSectionProps}
    >
      {header}
      {shouldPadBody ? (
        <EuiPageSection
          paddingSize={originalPadding ?? 'l'}
          contentProps={{ style: { paddingTop: 0 } }}
        >
          {children}
        </EuiPageSection>
      ) : (
        children
      )}
    </PageTemplateComponent>
  );
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
