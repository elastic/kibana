/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionChildrenProps } from '@kbn/cases-plugin/public';
import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import { SloCardChart } from '../pages/slos/components/card_view/slo_card_item';
import type { SLOSuggestion } from '../../common/cases/suggestions';
import { SloCardItemBadges } from '../pages/slos/components/card_view/slo_card_item_badges';

export function SLOSuggestionChildren(props: SuggestionChildrenProps<SLOSuggestion>) {
  const { suggestion } = props;
  // TODO: should this component receive multiple SLOs?
  if (suggestion.data.length === 1) {
    const slo = suggestion.data[0].payload;
    return (
      <EuiPanel
        className="sloCardItem"
        paddingSize="none"
        css={css`
          height: 182px;
          overflow: hidden;
          position: relative;

          & .sloCardItemActions_hover {
            pointer-events: none;
            opacity: 0;

            &:focus-within {
              pointer-events: auto;
              opacity: 1;
            }
          }
          &:hover .sloCardItemActions_hover {
            pointer-events: auto;
            opacity: 1;
          }
        `}
        title={slo.summary.status}
      >
        <SloCardChart
          slo={slo}
          badges={<SloCardItemBadges slo={slo} rules={[]} />}
          historicalSliData={[]}
        />
      </EuiPanel>
    );
  }
}
