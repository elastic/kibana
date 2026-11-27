/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDelayRender, EuiLoadingSpinner } from '@elastic/eui';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { ClassicPageTemplate, ClassicPageTemplateProps } from '@kbn/alertzero-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { isSecuritySolutionAccessible } from '../../../../helpers_access';

const WithoutTemplate: React.FC<ClassicPageTemplateProps> = ({ children }) => <>{children}</>;

/**
 * The Classic Security page template for another app's pages, loaded on first render so the
 * Security page-load bundle only carries this factory. Users who can't access Security get the
 * page on its own: Security registers no navigation links for them.
 */
export const createSecurityClassicPageTemplate = (
  getStartServices: StartServicesAccessor<{ spaces?: SpacesPluginStart }>
): ClassicPageTemplate => {
  const LazyTemplate = React.lazy(async () => {
    const [coreStart, { spaces }] = await getStartServices();
    if (!isSecuritySolutionAccessible(coreStart.application.capabilities)) {
      return { default: WithoutTemplate };
    }
    const { SecurityClassicPageTemplate } = await import('./security_classic_page_template');
    const Template: React.FC<ClassicPageTemplateProps> = (props) => (
      <SecurityClassicPageTemplate {...props} coreStart={coreStart} spaces={spaces} />
    );
    return { default: Template };
  });

  const SecurityClassicPageTemplateLoader: React.FC<ClassicPageTemplateProps> = (props) => (
    <React.Suspense
      fallback={
        <EuiDelayRender>
          <EuiLoadingSpinner size="xl" />
        </EuiDelayRender>
      }
    >
      <LazyTemplate {...props} />
    </React.Suspense>
  );
  return SecurityClassicPageTemplateLoader;
};
