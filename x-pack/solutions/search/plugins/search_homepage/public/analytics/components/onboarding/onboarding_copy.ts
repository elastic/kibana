/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ResolvedJourney } from '../../types';
import type { OnboardingStepId } from './onboarding_steps';

interface StepCopy {
  title: string;
  description?: string;
}

/** The page title: neutral until the data says which journey the setup is for. */
export const getSetupTitle = (journey: ResolvedJourney | undefined): string => {
  switch (journey) {
    case 'analytics':
      return i18n.translate('xpack.searchHomepage.analytics.onboarding.title', {
        defaultMessage: 'Get started with event analytics',
      });
    case 'search':
      return i18n.translate('xpack.searchHomepage.analytics.onboarding.searchTitle', {
        defaultMessage: 'Get started with search',
      });
    default:
      return i18n.translate('xpack.searchHomepage.analytics.onboarding.neutralTitle', {
        defaultMessage: 'Get started with Elasticsearch',
      });
  }
};

const getConnectCopy = (
  journey: ResolvedJourney | undefined,
  hasOnlySampleEvents: boolean
): StepCopy => {
  if (journey === undefined) {
    return {
      title: i18n.translate('xpack.searchHomepage.analytics.onboarding.connect.title', {
        defaultMessage: 'Add your data',
      }),
    };
  }
  if (journey === 'search') {
    return {
      title: i18n.translate('xpack.searchHomepage.analytics.onboarding.searchConnected.title', {
        defaultMessage: 'This deployment has data',
      }),
    };
  }
  if (hasOnlySampleEvents) {
    return {
      title: i18n.translate('xpack.searchHomepage.analytics.onboarding.sampleConnected.title', {
        defaultMessage: 'This deployment has sample events',
      }),
    };
  }
  return {
    title: i18n.translate('xpack.searchHomepage.analytics.onboarding.connected.title', {
      defaultMessage: 'This deployment has events',
    }),
  };
};

export const getStepCopy = (
  stepId: OnboardingStepId,
  journey: ResolvedJourney | undefined,
  hasOnlySampleEvents: boolean
): StepCopy => {
  switch (stepId) {
    case 'connect':
      return getConnectCopy(journey, hasOnlySampleEvents);
    case 'explore':
      return {
        title: i18n.translate('xpack.searchHomepage.analytics.onboarding.explore.title', {
          defaultMessage: 'Explore your events',
        }),
      };
    case 'dashboard':
      return {
        title: i18n.translate('xpack.searchHomepage.analytics.onboarding.dashboard.title', {
          defaultMessage: 'Build a dashboard',
        }),
        description: i18n.translate(
          'xpack.searchHomepage.analytics.onboarding.dashboard.description',
          {
            defaultMessage:
              'The dashboard opens with starter panels that you can edit before saving.',
          }
        ),
      };
    case 'search':
      return {
        title: i18n.translate('xpack.searchHomepage.analytics.onboarding.search.title', {
          defaultMessage: 'Try a search',
        }),
      };
    case 'build':
      return {
        title: i18n.translate('xpack.searchHomepage.analytics.onboarding.build.title', {
          defaultMessage: 'Build with your data',
        }),
      };
  }
};

/** The label of the one control that leads onward from a step; the last step leads home. */
export const getNextLabel = (nextStepId: OnboardingStepId | undefined): string => {
  switch (nextStepId) {
    case 'dashboard':
      return i18n.translate('xpack.searchHomepage.analytics.onboarding.nextButton', {
        defaultMessage: 'Next: build a dashboard',
      });
    case 'build':
      return i18n.translate('xpack.searchHomepage.analytics.onboarding.nextBuildButton', {
        defaultMessage: 'Next: build with your data',
      });
    default:
      return i18n.translate('xpack.searchHomepage.analytics.onboarding.finishButton', {
        defaultMessage: 'Go to home',
      });
  }
};
