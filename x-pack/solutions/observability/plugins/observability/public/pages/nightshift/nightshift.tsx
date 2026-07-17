/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { KnowledgeGraphView } from './knowledge_graph/knowledge_graph_view';

export function NightshiftPage() {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        position: relative;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: ${euiTheme.colors.body};
      `}
    >
      <KnowledgeGraphView />
    </div>
  );
}
