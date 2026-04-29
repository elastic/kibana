/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { TopNFunctions } from '@kbn/profiling-utils';
import { EMBEDDABLE_FUNCTIONS } from '.';
import { getProfilingComponent } from '../helpers/component_registry';

interface Props {
  data?: TopNFunctions;
  isLoading: boolean;
  rangeFrom: number;
  rangeTo: number;
  height?: string;
  showFullScreenSelector?: boolean;
}

export function EmbeddableFunctions(props: Props) {
  const EmbeddableFunctionsComponent = getProfilingComponent<Props>(EMBEDDABLE_FUNCTIONS);
  const { height } = props;
  const heightSetting = height ? `height: ${height}` : 'min-height: 0';

  return (
    <div
      css={css`
        width: 100%;
        ${heightSetting};
        overflow: visible;
        display: flex;
        flex: 1 1 100%;
        z-index: 1;
      `}
    >
      {EmbeddableFunctionsComponent && <EmbeddableFunctionsComponent {...props} />}
    </div>
  );
}
