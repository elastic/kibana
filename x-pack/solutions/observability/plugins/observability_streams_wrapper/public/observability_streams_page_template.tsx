/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';

export const createObservabilityStreamsAppPageTemplate =
  ({
    observabilityShared,
    navigation,
  }: {
    observabilityShared: ObservabilitySharedPluginStart;
    navigation: NavigationPublicStart;
  }) =>
  ({ children }: { children?: React.ReactNode }) => {
    const { PageTemplate } = observabilityShared.navigation;

    const isSolutionNavEnabled = useObservable(navigation.isSolutionNavEnabled$);

    return (
      <PageTemplate
        pageSectionProps={{
          color: 'subdued',
          css: css`
            max-height: calc(
              100vh - var(--euiFixedHeadersOffset, 0)
                ${isSolutionNavEnabled ? `- var(--kbnProjectHeaderAppActionMenuHeight, 48px)` : ''}
            );
            overflow: auto;
            padding-inline: 0px;
          `,
          contentProps: {
            css: css`
              padding-block: 0px;
              display: flex;
              flex-direction: column;
              height: 100%;
            `,
          },
        }}
      >
        {children}
      </PageTemplate>
    );
  };
