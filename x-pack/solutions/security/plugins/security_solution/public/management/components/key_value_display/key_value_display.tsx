/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';

export interface KeyValueDisplayProps {
  name: React.ReactNode;
  value: React.ReactNode;
}
export const KeyValueDisplay = memo<KeyValueDisplayProps>(({ name, value }) => {
  return (
    <div
      className="eui-textBreakWord"
      css={css`
        white-space: pre-wrap;
      `}
    >
      <strong>
        {name}
        {': '}
      </strong>
      {value}
    </div>
  );
});
KeyValueDisplay.displayName = 'KeyValueDisplay';
