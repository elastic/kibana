/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { SecurityPageName, useNavigateTo } from '@kbn/security-solution-navigation';
import { useStoredUrlDetails } from './use_stored_state';
import { OnboardingTopicId, type OnboardingCardId } from '../../constants';
import { useOnboardingContext } from '../onboarding_context';
import { useTopicId } from './use_topic_id';
import { useCloudTopicId } from './use_cloud_topic_id';

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

  const navigateToPath = useCallback(
    (path?: string | null) => {
      navigateTo({ deepLinkId: SecurityPageName.landing, path: path || undefined });
    },
    [navigateTo]
  );

  const setTopic = useCallback(
    (newTopicId: OnboardingTopicId) => {
      const path = newTopicId === OnboardingTopicId.default ? null : newTopicId;
      setStoredUrlDetail(path);
      navigateToPath(path);
    },
    [setStoredUrlDetail, navigateToPath]
  );

  const setCard = useCallback(
    (newCardId: OnboardingCardId | null) => {
      setHash(newCardId);
      setStoredUrlDetail(`${getTopicPath(topicId)}${getCardHash(newCardId)}` || null);
      if (newCardId != null) {
        telemetry.reportCardOpen(newCardId);
      }
    },
    [setStoredUrlDetail, topicId, telemetry]
  );

  return { topicId, setTopic, setCard, navigateToPath, storedUrlDetail, setStoredUrlDetail };
};

interface UseSyncUrlDetailsParams {
  pathTopicId: OnboardingTopicId | null;
  hashCardId: OnboardingCardId | null;
}
/**
 * This hook manages the expanded card id state in the LocalStorage and the hash in the URL.
 */
export const useSyncUrlDetails = ({ pathTopicId, hashCardId }: UseSyncUrlDetailsParams) => {
  const { config, telemetry } = useOnboardingContext();
  const { storedUrlDetail, setStoredUrlDetail, navigateToPath, setTopic } = useUrlDetail();

  const onComplete = useCallback((cloudTopicId: OnboardingTopicId | null) => {
    if (cloudTopicId && config.has(cloudTopicId)) {
      setTopic(cloudTopicId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { start: startGetCloudTopicId, isLoading } = useCloudTopicId({ onComplete });

  useEffect(() => {
    // Create the URL detail
    const urlDetail = `${pathTopicId || ''}${hashCardId ? `#${hashCardId}` : ''}`;

    // If the URL has a topic it has prevalence, we need to set it to the local storage
    if (urlDetail && urlDetail !== storedUrlDetail) {
      if (hashCardId) {
        telemetry.reportCardOpen(hashCardId, { auto: true });
      }
      setStoredUrlDetail(urlDetail);
      return;
    }

    // If the URL has no topic, but the local storage has a topic, we need to navigate to the topic
    if (!urlDetail && storedUrlDetail) {
      // Check if the stored topic is not valid, if so clear it to prevent inconsistencies
      const [storedTopicId] = storedUrlDetail.split('#');
      if (storedTopicId && !config.has(storedTopicId as OnboardingTopicId)) {
        setStoredUrlDetail(null);
        return;
      }
      navigateToPath(storedUrlDetail);
    }

    // If nothing is stored and nothing is in the URL, let's see if we have a cloud topic (first time onboarding)
    if (!urlDetail && storedUrlDetail === undefined) {
      startGetCloudTopicId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLoading };
};
