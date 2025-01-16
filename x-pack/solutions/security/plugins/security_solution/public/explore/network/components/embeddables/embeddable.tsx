/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

export interface EmbeddableProps {
  children: React.ReactNode;
}

export const Embeddable = React.memo<PropsWithChildren<EmbeddableProps>>(({ children }) => (
  <section className="siemEmbeddable" data-test-subj="siemEmbeddable">
    <EuiPanel
      css={css`
        overflow: hidden;
      `}
      paddingSize="none"
      hasBorder
    >
      {children}
    </EuiPanel>
  </section>
));
Embeddable.displayName = 'Embeddable';
