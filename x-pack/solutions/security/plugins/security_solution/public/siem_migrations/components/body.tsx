/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CenteredLoadingSpinner } from '../../common/components/centered_loading_spinner';
import type { OnboardingCardId } from '../../onboarding/constants';
import type { IsCardAvailable, SetExpandedCardId } from '../../onboarding/types';
import { OnboardingCardGroup } from '../../onboarding/components/onboarding_body/onboarding_card_group';
import { OnboardingCardPanel } from '../../onboarding/components/onboarding_body/onboarding_card_panel';
import { useCompletedCards } from '../../onboarding/components/onboarding_body/hooks/use_completed_cards';
import { siemMigrationsBodyConfig } from './body_config';

const HEIGHT_ANIMATION_DURATION = 250;

const scrollToCard = (cardId: OnboardingCardId) => {
  setTimeout(() => {
    const element = document.getElementById(cardId);
    if (element) {
      element.focus({ preventScroll: true });
      window.scrollTo({ top: element.offsetTop - 40, behavior: 'smooth' });
    }
  }, HEIGHT_ANIMATION_DURATION);
};

/**
 * Thin wrapper that reuses the onboarding card framework to render
 * the SIEM migrations body config on a standalone page (outside the onboarding router).
 */
const getCardIdFromHash = (hash: string): OnboardingCardId | null =>
  (hash.split('?')[0].replace('#', '') as OnboardingCardId) || null;

export const SiemMigrationsBody = React.memo(() => {
  const bodyConfig = siemMigrationsBodyConfig;
  const history = useHistory();
  const { hash } = useLocation();
  const cardIdFromHash = useMemo(() => getCardIdFromHash(hash), [hash]);

  const [expandedCardId, _setExpandedCardId] = useState<OnboardingCardId | null>(null);

  useEffect(() => {
    if (cardIdFromHash) {
      _setExpandedCardId(cardIdFromHash);
      scrollToCard(cardIdFromHash);
    }
  }, [cardIdFromHash]);

  const { isCardComplete, setCardComplete, getCardCheckCompleteResult, checkCardComplete } =
    useCompletedCards(bodyConfig);

  const setExpandedCardId = useCallback<SetExpandedCardId>(
    (newCardId, options) => {
      _setExpandedCardId(newCardId);
      history.replace({ hash: newCardId ? `#${newCardId}` : undefined });
      if (newCardId != null && options?.scroll) {
        scrollToCard(newCardId);
      }
    },
    [history]
  );

  const createOnToggleExpanded = useCallback(
    (cardId: OnboardingCardId) => () => {
      if (expandedCardId === cardId) {
        setExpandedCardId(null);
      } else {
        setExpandedCardId(cardId);
        checkCardComplete(cardId);
      }
    },
    [expandedCardId, setExpandedCardId, checkCardComplete]
  );

  const createSetCardComplete = useCallback(
    (cardId: OnboardingCardId) => (complete: boolean) => {
      setCardComplete(cardId, complete);
    },
    [setCardComplete]
  );

  const createCheckCardComplete = useCallback(
    (cardId: OnboardingCardId) => () => {
      checkCardComplete(cardId);
    },
    [checkCardComplete]
  );

  const isCardAvailable = useCallback<IsCardAvailable>(
    (cardId: OnboardingCardId) =>
      bodyConfig.some((group) => group.cards.some((card) => card.id === cardId)),
    [bodyConfig]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="xl">
      {bodyConfig.map((group, index) => (
        <EuiFlexItem key={index} grow={false}>
          <EuiSpacer size="xxl" />
          <OnboardingCardGroup title={group.title}>
            <EuiFlexGroup direction="column" gutterSize="m">
              {group.cards.map((card) => {
                const { id, title, icon, iconDark, badge, Component: LazyCardComponent } = card;
                const cardCheckCompleteResult = getCardCheckCompleteResult(id);
                return (
                  <EuiFlexItem key={id} grow={false}>
                    <OnboardingCardPanel
                      id={id}
                      title={title}
                      icon={icon}
                      iconDark={iconDark}
                      badge={badge}
                      checkCompleteResult={cardCheckCompleteResult}
                      isExpanded={expandedCardId === id}
                      isComplete={isCardComplete(id)}
                      onToggleExpanded={createOnToggleExpanded(id)}
                    >
                      <Suspense fallback={<CenteredLoadingSpinner size="m" />}>
                        <LazyCardComponent
                          setComplete={createSetCardComplete(id)}
                          checkComplete={createCheckCardComplete(id)}
                          isCardComplete={isCardComplete}
                          isCardAvailable={isCardAvailable}
                          setExpandedCardId={setExpandedCardId}
                          checkCompleteMetadata={cardCheckCompleteResult?.metadata}
                        />
                      </Suspense>
                    </OnboardingCardPanel>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </OnboardingCardGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});

SiemMigrationsBody.displayName = 'SiemMigrationsOnboardingBody';
