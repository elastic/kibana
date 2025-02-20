/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiPanel,
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
} from '@elastic/eui';
import classnames from 'classnames';
import type { OnboardingCardId } from '../../constants';
import type { CheckCompleteResult, CardBadge } from '../../types';
import { CARD_COMPLETE_BADGE, EXPAND_CARD_BUTTON_LABEL } from './translations';
import { useCardPanelStyles } from './onboarding_card_panel.styles';
import { useDelayedVisibility } from './hooks/use_delayed_visibility';
import { OnboardingCardBadge } from './onboarding_card_panel_badge';

interface OnboardingCardPanelProps {
  id: OnboardingCardId;
  title: string;
  icon: IconType;
  badge: CardBadge | undefined;
  isExpanded: boolean;
  isComplete: boolean;
  onToggleExpanded: () => void;
  checkCompleteResult?: CheckCompleteResult;
}

export const OnboardingCardPanel = React.memo<PropsWithChildren<OnboardingCardPanelProps>>(
  ({
    id,
    title,
    icon,
    badge,
    isExpanded,
    isComplete,
    onToggleExpanded,
    checkCompleteResult,
    children,
  }) => {
    const styles = useCardPanelStyles();
    const cardPanelClassName = classnames(styles, {
      'onboardingCardPanel-expanded': isExpanded,
      'onboardingCardPanel-completed': isComplete,
    });
    const isContentVisible = useDelayedVisibility({ isExpanded });

    return (
      <EuiPanel
        id={id}
        color="plain"
        grow={false}
        hasShadow={isExpanded}
        borderRadius="m"
        paddingSize="none"
        hasBorder={!isExpanded}
        className={cardPanelClassName}
      >
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          onClick={onToggleExpanded}
          className="onboardingCardHeader"
        >
          <EuiFlexItem grow={false}>
            <span className="onboardingCardIcon">
              <EuiIcon type={icon} size="l" />
            </span>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" direction="row">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs" className="onboardingCardHeaderTitle">
                  <h3>{title}</h3>
                </EuiTitle>
              </EuiFlexItem>
              {badge && (
                <EuiFlexItem grow={false}>
                  <OnboardingCardBadge badge={badge} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          {checkCompleteResult?.additionalBadges?.map((additionalBadge, index) => (
            <EuiFlexItem grow={false} key={index}>
              {additionalBadge}
            </EuiFlexItem>
          )) ?? null}

          {isComplete && (
            <EuiFlexItem grow={false}>
              <EuiBadge className="onboardingCardHeaderCompleteBadge">
                {checkCompleteResult?.completeBadgeText || CARD_COMPLETE_BADGE}
              </EuiBadge>
            </EuiFlexItem>
          )}

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="primary"
              size="xs"
              iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
              aria-label={EXPAND_CARD_BUTTON_LABEL(title)}
              aria-expanded={isExpanded}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <div className="onboardingCardContentWrapper">
          <div className="onboardingCardContent">{isContentVisible ? children : null}</div>
        </div>
      </EuiPanel>
    );
  }
);
OnboardingCardPanel.displayName = 'OnboardingCardPanel';
