/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { euiThemeVars } from '@kbn/ui-theme';
import * as i18n from './translations';

interface Props {
  stats: AttackDiscoveryStats | null;
}

export const StatusBell: React.FC<Props> = ({ stats }) => {
  if (stats && stats.newConnectorResultsCount > 0) {
    return (
      <EuiFlexItem grow={false}>
        <EuiIconTip
          color={euiThemeVars.euiColorAccentText}
          type="bell"
          content={i18n.ATTACK_DISCOVERY_STATS_MESSAGE(stats)}
          position="bottom"
          anchorProps={{
            css: css`
              animation-name: ringTheBell;
              animation-duration: 1s;
              @keyframes ringTheBell {
                0% {
                  transform: skewX(-15deg);
                }
                7% {
                  transform: skewX(15deg);
                }
                14% {
                  transform: skewX(-15deg);
                }
                21% {
                  transform: skewX(15deg);
                }
                28% {
                  transform: skewX(-15deg);
                }
                35% {
                  transform: skewX(15deg);
                }
                52% {
                  transform: skewX(-15deg);
                }
                55% {
                  transform: skewX(0deg);
                }
                100% {
                  transform: skewX(0deg);
                }
              }
            `,
          }}
        />
      </EuiFlexItem>
    );
  }
  return null;
};
