/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { StatusHeader } from './status_header';
import { MainSignificantEvent } from './main_significant_event';
import type { ImpactedService } from './main_significant_event';
import { ImpactedCard } from './impacted_card';
import type { ImpactedCardProps } from './impacted_card';

export type SigEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ImpactedCardItem extends ImpactedCardProps {
  id: string;
}

const DEFAULT_IMPACTED_CARDS: ImpactedCardItem[] = [
  { id: 'payment', label: 'Service', value: 'payment', iconType: 'package' },
  { id: 'checkout', label: 'Service', value: 'checkout', iconType: 'package' },
];

export interface SigeventsOverviewProps {
  state?: 'critical' | 'warning' | 'healthy';
  blastRadiusScore?: number;
  title?: string;
  description?: string;
  mainEventTitle?: string;
  impactedServices?: ImpactedService[];
  impactedCards?: ImpactedCardItem[];
  onRemediate?: () => void;
  onViewDetails?: () => void;
}

export const SigeventsOverview = ({
  state = 'critical',
  blastRadiusScore,
  title,
  description,
  mainEventTitle,
  impactedServices,
  impactedCards = DEFAULT_IMPACTED_CARDS,
  onRemediate,
  onViewDetails,
}: SigeventsOverviewProps) => {
  const { euiTheme } = useEuiTheme();

  if (state !== 'critical') {
    return null;
  }

  return (
    <div
      data-test-subj="sigeventsOverview"
      css={css`
        width: 100%;
        max-width: 800px;
        align-self: center;
        box-sizing: border-box;
        padding: ${euiTheme.size.l};
      `}
    >
      <StatusHeader title={title} description={description} />

      <EuiSpacer size="l" />

      {impactedCards.length > 0 && (
        <>
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            data-test-subj="sigeventsOverviewImpactedCards"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.observability.sigeventsOverview.impactedSectionLabel', {
                  defaultMessage: 'Impacted',
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                {impactedCards.map(({ id, ...card }) => (
                  <EuiFlexItem key={id}>
                    <ImpactedCard {...card} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />
        </>
      )}

      <MainSignificantEvent
        blastRadiusScore={blastRadiusScore}
        title={mainEventTitle}
        impactedServices={impactedServices}
        onRemediate={onRemediate}
        onViewDetails={onViewDetails}
      />
    </div>
  );
};
