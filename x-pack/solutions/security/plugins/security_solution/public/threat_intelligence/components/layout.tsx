/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { SecurityAppHeader } from '../../common/components/app_header';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useKibana } from '../../common/lib/kibana';

export interface LayoutProps {
  pageTitle: string;
}

export const DefaultPageLayout: FC<PropsWithChildren<LayoutProps>> = ({ children, pageTitle }) => {
  const { docLinks } = useKibana().services;

  return (
    <SecuritySolutionPageWrapper>
      {/* The header must be a direct child of the wrapper, otherwise it does not stay sticky. */}
      <SecurityAppHeader
        title={pageTitle}
        spacing="largeBleed"
        docLink={docLinks.links.siem.indicatorsPage}
      />
      <EuiSpacer size="m" />
      {children}
    </SecuritySolutionPageWrapper>
  );
};
