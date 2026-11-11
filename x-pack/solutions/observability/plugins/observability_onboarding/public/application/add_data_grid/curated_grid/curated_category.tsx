/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';

interface Props {
  id: string;
  label: string;
  children: React.ReactNode;
}

export const CuratedCategorySection = ({ id, label, children }: Props) => {
  const labelId = useGeneratedHtmlId({ prefix: 'integrationsCategory', suffix: id });
  const { euiTheme } = useEuiTheme();

  return (
    <section aria-labelledby={labelId}>
      <EuiTitle
        size="xxs"
        css={css`
          color: ${euiTheme.colors.textSubdued};
          text-transform: uppercase;
        `}
      >
        <h4 id={labelId}>{label}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {children}
    </section>
  );
};
