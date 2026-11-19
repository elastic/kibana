/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GENERATED_DASHBOARD_REFRESH_INTERVAL_SECONDS } from '../../dashboard_refresh';
import type { ResolvedJourney } from '../../types';
import type { OnboardingStepId } from './onboarding_steps';

interface StepCopy {
  title: string;
  description: string;
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
      description: i18n.translate('xpack.searchHomepage.analytics.onboarding.connect.description', {
        defaultMessage:
          'Choose how to get your data into Elasticsearch. One source is enough to start, and the next steps open when your data arrives.',
      }),
    };
  }
  if (journey === 'search') {
    return {
      title: i18n.translate('xpack.searchHomepage.analytics.onboarding.searchConnected.title', {
        defaultMessage: 'Your data is ready to search',
      }),
      description: i18n.translate(
        'xpack.searchHomepage.analytics.onboarding.searchConnected.description',
        {
          defaultMessage: 'This deployment holds data, so you can go straight to searching it.',
        }
      ),
    };
  }
  if (hasOnlySampleEvents) {
    return {
      title: i18n.translate('xpack.searchHomepage.analytics.onboarding.sampleConnected.title', {
        defaultMessage: 'Your sample events are ready to explore',
      }),
      description: i18n.translate(
        'xpack.searchHomepage.analytics.onboarding.sampleConnected.description',
        {
          defaultMessage:
            'This deployment holds sample events, so you can go straight to exploring them. Connect a source of your own at any time.',
        }
      ),
    };
  }
  return {
    title: i18n.translate('xpack.searchHomepage.analytics.onboarding.connected.title', {
      defaultMessage: 'Your events are ready to explore',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.onboarding.connected.description', {
      defaultMessage: 'This deployment holds events, so you can go straight to exploring them.',
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
        description: i18n.translate(
          'xpack.searchHomepage.analytics.onboarding.explore.description',
          { defaultMessage: 'Ask a first question of the events that are now in your deployment.' }
        ),
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
              'Turn your events into a dashboard. It opens with starter panels that you can edit before saving, and refreshes every {seconds, plural, one {second} other {# seconds}}.',
            values: { seconds: GENERATED_DASHBOARD_REFRESH_INTERVAL_SECONDS },
          }
        ),
      };
    case 'search':
      return {
        title: i18n.translate('xpack.searchHomepage.analytics.onboarding.search.title', {
          defaultMessage: 'Try a search',
        }),
        description: i18n.translate(
          'xpack.searchHomepage.analytics.onboarding.search.description',
          {
            defaultMessage:
              'Run a first search on your own data. Console opens with a request that returns documents as it is; change the query to look for your own words.',
          }
        ),
      };
    case 'build':
      return {
        title: i18n.translate('xpack.searchHomepage.analytics.onboarding.build.title', {
          defaultMessage: 'Build with your data',
        }),
        description: i18n.translate('xpack.searchHomepage.analytics.onboarding.build.description', {
          defaultMessage:
            'Go from a first search to something you can ship: work out queries, relevance and mappings on the data you just added.',
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
