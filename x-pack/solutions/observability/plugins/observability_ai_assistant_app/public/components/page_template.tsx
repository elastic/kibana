/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import React from 'react';
import { useKibana } from '../hooks/use_kibana';

const pageSectionContentClassName = css`
  width: 100%;
  display: flex;
  flex-grow: 1;
  padding-top: 0;
  padding-bottom: 0;
  max-block-size: calc(100vh - 96px);
`;

export function ObservabilityAIAssistantPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    services: {
      plugins: {
        start: { observabilityShared },
      },
    },
  } = useKibana();

  const PageTemplate = observabilityShared.navigation.PageTemplate;

  return (
    <PageTemplate
      pageSectionProps={{
        alignment: 'horizontalCenter',
        restrictWidth: true,
        contentProps: {
          className: pageSectionContentClassName,
        },
        paddingSize: 'none',
      }}
    >
      {children}
    </PageTemplate>
  );
}
