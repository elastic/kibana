/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

type Props = React.ComponentProps<typeof EuiButtonEmpty> & {
  contentReferenceCount: number;
};

export const ContentReferenceButton: React.FC<Props> = ({
  contentReferenceCount,
  ...euiButtonEmptyProps
}) => {
  return (
    <EuiButtonEmpty
      size="xs"
      style={{
        padding: 0,
        blockSize: 'auto',
      }}
      data-test-subj="ContentReferenceButton"
      {...euiButtonEmptyProps}
    >
      <sup style={{
        verticalAlign: 'baseline',
        position: 'relative',
        top: '-0.3em',
      }}>{`[${contentReferenceCount}]`}</sup>
    </EuiButtonEmpty>
  );
};
