/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import type { EuiEmptyPromptProps } from '@elastic/eui';
import { EuiPageSection } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { PageTemplate } from '../page_template';

interface NoIndicesProps extends Omit<EuiEmptyPromptProps, 'body' | 'title'> {
  body: string;
  /** Kept on no-remote-cluster pages so AppHeader/menu still render. */
  header?: React.ReactNode;
  title: string;
}

const filledPageSectionContentCss = css`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
`;

// Represents a fully constructed page, including page template.
export const NoIndices: React.FC<NoIndicesProps> = ({ body, header, title, ...rest }) => {
  const emptyPrompt = (
    <KibanaPageTemplate.EmptyPrompt
      title={<h2>{title}</h2>}
      body={<PreLineText>{body}</PreLineText>}
      {...rest}
    />
  );

  if (!header) {
    return <PageTemplate isEmptyState={true}>{emptyPrompt}</PageTemplate>;
  }

  // isEmptyState centers every child, including AppHeader. Pin the header at the top
  // and center only the empty prompt in the remaining pane.
  return (
    <PageTemplate
      pageSectionProps={{
        paddingSize: 'none',
        contentProps: {
          css: filledPageSectionContentCss,
        },
      }}
    >
      {header}
      <EuiPageSection alignment="center" grow>
        {emptyPrompt}
      </EuiPageSection>
    </PageTemplate>
  );
};

const PreLineText = styled.p`
  white-space: pre-line;
`;
