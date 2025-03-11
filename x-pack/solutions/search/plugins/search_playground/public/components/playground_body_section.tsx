/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

const PlaygroundBodySectionStyle = css`
  display: flex;
  flex-grow: 1;
  position: absolute;
  inset: 0;
`;

export const PlaygroundBodySection = ({
  children,
}: {
  children: React.ReactNode | React.ReactNode[];
}) => (
  <KibanaPageTemplate.Section
    alignment="top"
    grow
    css={{
      position: 'relative',
    }}
    contentProps={{ css: PlaygroundBodySectionStyle }}
    paddingSize="none"
    className="eui-fullHeight"
  >
    {children}
  </KibanaPageTemplate.Section>
);
