/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HEIGHT_ANIMATION_DURATION } from '../onboarding_card_panel.styles';
import { type OnboardingCardId } from '../../../constants';
import type { SetExpandedCardId } from '../../../types';
import { getCardIdFromHash, useUrlDetail } from '../../hooks/use_url_detail';

const HEADER_OFFSET = 40;

const scrollToCard = (cardId: OnboardingCardId) => {
  setTimeout(() => {
    const element = document.getElementById(cardId);
    if (element) {
      element.focus({ preventScroll: true });
      window.scrollTo({ top: element.offsetTop - HEADER_OFFSET, behavior: 'smooth' });
    }
  }, HEIGHT_ANIMATION_DURATION);
};

/**
 * This hook manages the expanded card id state in the LocalStorage and the hash in the URL.
 */
export const useExpandedCard = () => {
  const { setCard } = useUrlDetail();
  const { hash } = useLocation();
  const cardIdFromHash = useMemo(() => getCardIdFromHash(hash), [hash]);

  const [expandedCardId, _setExpandedCardId] = useState<OnboardingCardId | null>(null);

  // This effect implements auto-scroll in the initial render.
  useEffect(() => {
    if (cardIdFromHash) {
      _setExpandedCardId(cardIdFromHash);
      scrollToCard(cardIdFromHash);
    }
    // cardIdFromHash is only defined once on page load
    // it does not change with subsequent url hash changes since history.replaceState is used
  }, [cardIdFromHash]);

  const setExpandedCardId = useCallback<SetExpandedCardId>(
    (newCardId, options) => {
      _setExpandedCardId(newCardId);
      setCard(newCardId);
      if (newCardId != null && options?.scroll) {
        scrollToCard(newCardId);
      }
    },
    [setCard]
  );

  return { expandedCardId, setExpandedCardId };
};
