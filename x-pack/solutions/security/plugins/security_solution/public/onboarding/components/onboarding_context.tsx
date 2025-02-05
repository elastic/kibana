/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import type { OnboardingTopicId, OnboardingCardId } from '../constants';
import { OnboardingHubEventTypes } from '../../common/lib/telemetry';
import { useLicense } from '../../common/hooks/use_license';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

import { hasCapabilities } from '../../common/lib/capabilities';
import type {
  OnboardingConfigAvailabilityProps,
  OnboardingGroupConfig,
  TopicConfig,
} from '../types';
import { onboardingConfig } from '../config';

export interface OnboardingTelemetry {
  reportCardOpen: (cardId: OnboardingCardId, options?: { auto?: boolean }) => void;
  reportCardComplete: (cardId: OnboardingCardId, options?: { auto?: boolean }) => void;
  reportCardLinkClicked: (cardId: OnboardingCardId, linkId: string) => void;
}

export type OnboardingConfig = Map<OnboardingTopicId, TopicConfig>;
export interface OnboardingContextValue {
  spaceId: string;
  telemetry: OnboardingTelemetry;
  config: OnboardingConfig;
}
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingContextProvider: React.FC<PropsWithChildren<{ spaceId: string }>> =
  React.memo(({ children, spaceId }) => {
    const config = useFilteredConfig();
    const telemetry = useOnboardingTelemetry();

    const value = useMemo<OnboardingContextValue>(
      () => ({ spaceId, telemetry, config }),
      [spaceId, telemetry, config]
    );

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
  });
OnboardingContextProvider.displayName = 'OnboardingContextProvider';

export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error(
      'No OnboardingContext found. Please wrap the application with OnboardingProvider'
    );
  }
  return context;
};

/**
 * Hook that filters the config based on the user's capabilities, license and experimental features
 */
const useFilteredConfig = (): OnboardingConfig => {
  const { capabilities } = useKibana().services.application;
  const experimentalFeatures = ExperimentalFeaturesService.get();
  const license = useLicense();

  const isAvailable = useCallback(
    (item: OnboardingConfigAvailabilityProps) => {
      if (item.experimentalFlagRequired && !experimentalFeatures[item.experimentalFlagRequired]) {
        return false;
      }
      if (
        item.disabledExperimentalFlagRequired &&
        experimentalFeatures[item.disabledExperimentalFlagRequired]
      ) {
        return false;
      }
      if (item.licenseTypeRequired && !license.isAtLeast(item.licenseTypeRequired)) {
        return false;
      }
      if (item.capabilitiesRequired && !hasCapabilities(capabilities, item.capabilitiesRequired)) {
        return false;
      }
      return true;
    },
    [license, capabilities, experimentalFeatures]
  );

  const filteredConfig = useMemo(
    () =>
      onboardingConfig.reduce<OnboardingConfig>((filteredTopicConfigs, topicConfig) => {
        if (!isAvailable(topicConfig)) {
          return filteredTopicConfigs;
        }
        const filteredBody = topicConfig.body.reduce<OnboardingGroupConfig[]>(
          (filteredGroups, group) => {
            const filteredCards = group.cards.filter(isAvailable);

            if (filteredCards.length > 0) {
              filteredGroups.push({ ...group, cards: filteredCards });
            }
            return filteredGroups;
          },
          []
        );
        if (filteredBody.length > 0) {
          filteredTopicConfigs.set(topicConfig.id, { ...topicConfig, body: filteredBody });
        }
        return filteredTopicConfigs;
      }, new Map<OnboardingTopicId, TopicConfig>()),
    [isAvailable]
  );

  return filteredConfig;
};

const useOnboardingTelemetry = (): OnboardingTelemetry => {
  const { telemetry } = useKibana().services;
  return useMemo(
    () => ({
      reportCardOpen: (cardId, { auto = false } = {}) => {
        telemetry.reportEvent(OnboardingHubEventTypes.OnboardingHubStepOpen, {
          stepId: cardId,
          trigger: auto ? 'navigation' : 'click',
        });
      },
      reportCardComplete: (cardId, { auto = false } = {}) => {
        telemetry.reportEvent(OnboardingHubEventTypes.OnboardingHubStepFinished, {
          stepId: cardId,
          trigger: auto ? 'auto_check' : 'click',
        });
      },
      reportCardLinkClicked: (cardId, linkId: string) => {
        telemetry.reportEvent(OnboardingHubEventTypes.OnboardingHubStepLinkClicked, {
          originStepId: cardId,
          stepLinkId: linkId,
        });
      },
    }),
    [telemetry]
  );
};
