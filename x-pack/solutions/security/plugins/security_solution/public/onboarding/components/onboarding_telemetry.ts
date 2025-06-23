/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import type { OnboardingCardId } from '../constants';
import { OnboardingTopicId } from '../constants';
import { OnboardingHubEventTypes } from '../../common/lib/telemetry';
import { onboardingConfig } from '../config';
import { trackOnboardingLinkClick } from './lib/telemetry';
import type { ReportLinkClick } from '../../common/lib/integrations/hooks/integration_context';

export interface OnboardingTelemetry {
  reportCardOpen: (cardId: OnboardingCardId, options?: { auto?: boolean }) => void;
  reportCardComplete: (cardId: OnboardingCardId, options?: { auto?: boolean }) => void;
  reportCardLinkClicked: (cardId: OnboardingCardId, linkId: string) => void;
  reportCardSelectorClicked: (cardId: OnboardingCardId, selectorId: string) => void;
  reportLinkClick: ReportLinkClick;
}

export const useOnboardingTelemetry = (): OnboardingTelemetry => {
  const { telemetry } = useKibana().services;
  return useMemo(
    () => ({
      reportCardOpen: (cardId, { auto = false } = {}) => {
        telemetry.reportEvent(OnboardingHubEventTypes.OnboardingHubStepOpen, {
          stepId: getStepId(cardId),
          trigger: auto ? 'navigation' : 'click',
        });
      },
      reportCardComplete: (cardId, { auto = false } = {}) => {
        telemetry.reportEvent(OnboardingHubEventTypes.OnboardingHubStepFinished, {
          stepId: getStepId(cardId),
          trigger: auto ? 'auto_check' : 'click',
        });
      },
      reportCardLinkClicked: (cardId, linkId: string) => {
        telemetry.reportEvent(OnboardingHubEventTypes.OnboardingHubStepLinkClicked, {
          originStepId: getStepId(cardId),
          stepLinkId: linkId,
        });
      },
      reportCardSelectorClicked: (cardId, selectorId: string) => {
        telemetry.reportEvent(OnboardingHubEventTypes.OnboardingHubStepSelectorClicked, {
          originStepId: getStepId(cardId),
          selectorId,
        });
      },
      reportLinkClick: trackOnboardingLinkClick,
    }),
    [telemetry]
  );
};

/**
 * Get the step id for a given card id.
 * The stepId is used to track the onboarding card in telemetry, it is a combination of the topic id and the card id.
 * To keep backwards compatibility, if the card is in the default topic, the stepId will be the card id only.
 */
const getStepId = (cardId: OnboardingCardId) => {
  const cardTopic = onboardingConfig.find((topic) =>
    topic.body.some((group) => group.cards.some((card) => card.id === cardId))
  );
  if (!cardTopic || cardTopic.id === OnboardingTopicId.default) {
    return cardId; // Do not add topic id for default topic to preserve existing events format
  }
  return `${cardTopic.id}#${cardId}`;
};
