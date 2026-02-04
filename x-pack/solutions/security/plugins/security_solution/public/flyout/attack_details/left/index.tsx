/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { useAttackDetailsContext } from '../context';
import type { AttackDetailsLeftPanelProps } from '../types';

/**
 * Left panel of the Attack Details flyout. Rendered when the user clicks "Expand details"
 * in the right panel. Uses the same attack context (attackId, indexName) as the right panel.
 */
export const AttackDetailsLeftPanel: FC<Partial<AttackDetailsLeftPanelProps>> = memo(() => {
  const { euiTheme } = useEuiTheme();
  useAttackDetailsContext();

  return (
    <>
      <FlyoutHeader
        css={css`
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.attackDetails.left.title"
          defaultMessage="Attack details"
        />
      </FlyoutHeader>
      <FlyoutBody
        css={css`
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      >
        {/* TODO: Add Insights and Notes tabs */}
        <span>{'Insights and Notes tabs'}</span>
      </FlyoutBody>
    </>
  );
});

AttackDetailsLeftPanel.displayName = 'AttackDetailsLeftPanel';
