/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';

const PlaygroundBodySectionStyle = css({
  display: 'flex',
  height: '100%',
  overflowX: 'auto',
});

export const PlaygroundBodySection = ({
  color,
  children,
  dataTestSubj,
}: {
  color?: CSSProperties['backgroundColor'];
  children: React.ReactNode | React.ReactNode[];
  dataTestSubj?: string;
}) => (
  <KibanaPageTemplate.Section
    alignment="top"
    grow
    css={{
      position: 'relative',
      backgroundColor: color,
      justifyContent: 'center',
    }}
    contentProps={{ css: PlaygroundBodySectionStyle }}
    paddingSize="none"
    className="eui-fullHeight"
    data-test-subj={dataTestSubj}
  >
    {children}
  </KibanaPageTemplate.Section>
);
