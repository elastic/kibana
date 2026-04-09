/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { Header } from '../header';

interface TemplateProps {
  customHeader?: React.ReactNode;
}

export const PageTemplate: React.FC<React.PropsWithChildren<TemplateProps>> = ({
  children,
  customHeader,
}) => {
  return (
    <EuiPageTemplate
      css={css`
        padding-top: 0px !important;
      `}
    >
      {!!customHeader ? customHeader : <Header />}
      <EuiPageTemplate.Section
        paddingSize="none"
        restrictWidth
        css={css`
          padding-block-start: 32px;
          padding-block-end: 96px;
        `}
      >
        {children}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
