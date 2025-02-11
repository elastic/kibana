/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { TopNType } from '@kbn/profiling-utils';
import { EMBEDDABLE_STACK_TRACES } from '.';
import { getProfilingComponent } from '../helpers/component_registry';

interface Props {
  type: TopNType;
  kuery: string;
  rangeFrom: number;
  rangeTo: number;
  onClick: (category: string) => void;
  onChartBrushEnd: (range: { rangeFrom: string; rangeTo: string }) => void;
}

export function EmbeddableStackTraces(props: Props) {
  const EmbeddableStackTracesComponent = getProfilingComponent<Props>(EMBEDDABLE_STACK_TRACES);
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        flex: 1 1 100%;
        z-index: 1;
        min-height: 0;
      `}
    >
      {EmbeddableStackTracesComponent && <EmbeddableStackTracesComponent {...props} />}
    </div>
  );
}
