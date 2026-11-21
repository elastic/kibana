/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

/**
 * `KibanaPageTemplate` with the Security navigation panel's look, shared by every page that shows
 * the Security navigation in Classic.
 */
export const SecurityKibanaPageTemplate: React.FC<Omit<KibanaPageTemplateProps, 'ref'>> = (
  props
) => {
  const { euiTheme } = useEuiTheme();
  return (
    <KibanaPageTemplate
      css={css`
        .kbnSolutionNav__sidebar:not(.kbnSolutionNav__sidebar--shrink) {
          background-color: ${euiTheme.colors.emptyShade};
        }
      `}
      {...props}
    />
  );
};
