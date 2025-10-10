/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const dataPanel = css({
  // TODO: This CSS can be removed once EUI supports tables in subdued panels
  '.dataPanel--filled': {
    '.euiTable': {
      backgroundColor: 'transparent',
    },
  },

  overflow: 'hidden',
  position: 'relative',
});
