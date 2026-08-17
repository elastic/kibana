/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageSectionProps, EuiThemeComputed } from '@elastic/eui';
import { EuiPageSection, useEuiTheme } from '@elastic/eui';

export type PndPageSectionProps = Omit<EuiPageSectionProps, 'paddingSize'>;

const getContentPaddingCss = (euiTheme: EuiThemeComputed) => ({
  padding: `${euiTheme.size.l} 0`,
});

/**
 * Shared page body for PND routes. Keeps title/content snug under chrome
 * without clobbering EuiPageSection base flex styles — padding is applied
 * via `contentProps` on the inner wrapper.
 */
export const PndPageSection: React.FC<PndPageSectionProps> = ({
  children,
  contentProps,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  const paddingCss = getContentPaddingCss(euiTheme);
  const { css: contentCss, ...restContentProps } = contentProps ?? {};

  return (
    <EuiPageSection
      paddingSize="none"
      contentProps={{
        ...restContentProps,
        css: contentCss ? [paddingCss, contentCss] : paddingCss,
      }}
      {...rest}
    >
      {children}
    </EuiPageSection>
  );
};
