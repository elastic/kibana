/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { getRateLimitTitle, listLabels } from './translations';

export const RateLimitCallout = ({ count, onShow }: { count: number; onShow?: () => void }) => (
  <EuiCallOut
    announceOnMount
    size="s"
    color="warning"
    iconType="hourglass"
    title={getRateLimitTitle(count)}
    text={listLabels.rateLimitBody}
    actionProps={
      onShow
        ? {
            primary: {
              children: listLabels.showRateLimited,
              onClick: onShow,
              'data-test-subj': 'automationsShowRateLimited',
            },
          }
        : undefined
    }
    data-test-subj="automationsRateLimitBanner"
  />
);
