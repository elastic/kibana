/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageSectionProps } from '@elastic/eui';
import { EuiLoadingElastic, EuiPageTemplate } from '@elastic/eui';
import { css, cx } from '@emotion/css';
import type { AppHeaderProps } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

const templateClassName = css`
  height: var(--kbn-application--content-height, 100vh);
`;

const noPaddingClassName = css`
  padding: 0;
`;

const bodyClassName = css`
  overflow-y: auto;
`;

const bodyContentClassName = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const SignificantEventsAppHeader = (props: AppHeaderProps) => <AppHeader {...props} />;

export const SignificantEventsAppLoading = () => (
  <EuiPageTemplate.EmptyPrompt
    color="transparent"
    icon={
      <EuiLoadingElastic
        size="xxl"
        aria-label={i18n.translate('xpack.significantEventsApp.loadingLabel', {
          defaultMessage: 'Loading',
        })}
      />
    }
  />
);

export function SignificantEventsAppPageTemplate({ children }: { children: React.ReactNode }) {
  return (
    <EuiPageTemplate
      grow={false}
      offset={0}
      minHeight={0}
      restrictWidth={false}
      className={templateClassName}
    >
      {children}
    </EuiPageTemplate>
  );
}

SignificantEventsAppPageTemplate.Header = EuiPageTemplate.Header;
SignificantEventsAppPageTemplate.EmptyPrompt = EuiPageTemplate.EmptyPrompt;
SignificantEventsAppPageTemplate.Body = ({
  noPadding,
  ...props
}: EuiPageSectionProps & { noPadding?: boolean }) => (
  <EuiPageTemplate.Section
    grow
    className={noPadding ? cx(bodyClassName, noPaddingClassName) : bodyClassName}
    contentProps={{
      className: noPadding ? cx(bodyContentClassName, noPaddingClassName) : bodyContentClassName,
    }}
    {...props}
  />
);
