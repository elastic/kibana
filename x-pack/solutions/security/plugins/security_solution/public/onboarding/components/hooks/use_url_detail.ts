/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { SecurityPageName, useNavigateTo } from '@kbn/security-solution-navigation';
import { useStoredUrlDetails } from './use_stored_state';
import { OnboardingTopicId, type OnboardingCardId } from '../../constants';
import { useOnboardingContext } from '../onboarding_context';
import { useTopicId } from './use_topic_id';

export const getCardIdFromHash = (hash: string): OnboardingCardId | null =>
  (hash.split('?')[0].replace('#', '') as OnboardingCardId) || null;

const setHash = (cardId: OnboardingCardId | null) => {
  history.replaceState(null, '', cardId == null ? ' ' : `#${cardId}`);
};

const getTopicPath = (topicId: OnboardingTopicId) =>
  topicId !== OnboardingTopicId.default ? topicId : '';

const getCardHash = (cardId: OnboardingCardId | null) => (cardId ? `#${cardId}` : '');

/**
 * This hook manages the expanded card id state in the LocalStorage and the hash in the URL.
 */
export const useUrlDetail = () => {
  const { spaceId, telemetry } = useOnboardingContext();
  const topicId = useTopicId();
  const [storedUrlDetail, setStoredUrlDetail] = useStoredUrlDetails(spaceId);

  const { navigateTo } = useNavigateTo();

  const setTopicDetail = useCallback(
    (newTopicId: OnboardingTopicId) => {
      const path = newTopicId === OnboardingTopicId.default ? undefined : newTopicId;
      setStoredUrlDetail(path ?? null);
      navigateTo({ deepLinkId: SecurityPageName.landing, path });
    },
    [setStoredUrlDetail, navigateTo]
  );

  const setCardDetail = useCallback(
    (newCardId: OnboardingCardId | null) => {
      setHash(newCardId);
      setStoredUrlDetail(`${getTopicPath(topicId)}${getCardHash(newCardId)}` || null);
      if (newCardId != null) {
        telemetry.reportCardOpen(newCardId);
      }
    },
    [setStoredUrlDetail, topicId, telemetry]
  );

  const syncUrlDetails = useCallback(
    (pathTopicId: OnboardingTopicId | null, hashCardId: OnboardingCardId | null) => {
      const urlDetail = `${pathTopicId || ''}${hashCardId ? `#${hashCardId}` : ''}`;
      if (urlDetail && urlDetail !== storedUrlDetail) {
        if (hashCardId) {
          telemetry.reportCardOpen(hashCardId, { auto: true });
        }
        setStoredUrlDetail(urlDetail);
      }
      if (!urlDetail && storedUrlDetail) {
        navigateTo({ deepLinkId: SecurityPageName.landing, path: storedUrlDetail });
      }
    },
    [navigateTo, setStoredUrlDetail, storedUrlDetail, telemetry]
  );

  return { setTopicDetail, setCardDetail, syncUrlDetails };
};
