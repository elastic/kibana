/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import type { OnboardingCardId } from '../../../../constants';
import type { RulesCardItemId } from '../rules/types';
import type { AlertsCardItemId } from '../alerts/types';
import type { DashboardsCardItemId } from '../dashboards/types';
import { useCardSelectorListStyles } from './card_selector_list.styles';
import { HEIGHT_ANIMATION_DURATION } from '../../onboarding_card_panel.styles';
import { useOnboardingContext } from '../../../onboarding_context';
import type { KnowledgeSourceCardItemId } from '../knowledge_source/types';

export interface CardSelectorListItem {
  id: RulesCardItemId | AlertsCardItemId | DashboardsCardItemId | KnowledgeSourceCardItemId;
  title: string;
  description: string;
}

export interface CardSelectorListProps {
  items: CardSelectorListItem[];
  onSelect: (item: CardSelectorListItem) => void;
  selectedItem: CardSelectorListItem;
  title?: string;
  cardId: OnboardingCardId;
}

const scrollToSelectedItem = (cardId: string) => {
  setTimeout(() => {
    const element = document.getElementById(`selector-${cardId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, HEIGHT_ANIMATION_DURATION + 250);
};

export const CardSelectorList = React.memo<CardSelectorListProps>(
  ({ items, onSelect, selectedItem, title, cardId }) => {
    const { telemetry } = useOnboardingContext();
    const styles = useCardSelectorListStyles();

    useEffect(() => {
      scrollToSelectedItem(selectedItem.id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelect = useCallback(
      (item: CardSelectorListItem) => {
        onSelect(item);
        telemetry.reportCardSelectorClicked(cardId, item.id);
      },
      [cardId, onSelect, telemetry]
    );

    return (
      <EuiFlexGroup
        data-test-subj="cardSelectorList"
        direction="column"
        gutterSize="s"
        className={styles}
      >
        {title && (
          <EuiFlexItem>
            <EuiText size="xs" className="cardSelectorTitle">
              {title}
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup
            id="scroll-container"
            className="cardSelectorContent"
            direction="column"
            gutterSize="s"
          >
            {items.map((item) => (
              <EuiFlexItem key={`key-${item.id}`} id={`selector-${item.id}`} grow={false}>
                <EuiPanel
                  hasBorder
                  data-test-subj={`cardSelectorItem-${item.id}`}
                  className={selectedItem.id === item.id ? 'selectedCardPanelItem' : ''}
                  color={selectedItem.id === item.id ? 'subdued' : 'plain'}
                  element="button"
                  onClick={() => handleSelect(item)}
                >
                  <EuiTitle size="xxs">
                    <h5>{item.title}</h5>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs">{item.description}</EuiText>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
CardSelectorList.displayName = 'CardSelectorList';
