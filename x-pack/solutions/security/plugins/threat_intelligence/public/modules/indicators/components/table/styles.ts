/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const popoverMaxWidth: CSSObject = {
    'max-width': '240px',
    'word-break': 'break-word',
  };

  const tableCell: CSSObject = {
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'overflow-wrap': 'initial',
    'word-wrap': 'initial',
    'word-break': 'initial',
  };

  return {
    popoverMaxWidth,
    tableCell,
  };
};
