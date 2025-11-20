/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NoDataCardComponentProps } from '@kbn/shared-ux-card-no-data-types';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  type ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { noMetricIndicesPromptDescription, noMetricIndicesPromptTitle } from '../../empty_states';

export enum OnboardingFlow {
  Infra = 'infra',
  Hosts = 'host',
}

interface NoDataConfigDetails {
  onboardingFlow: OnboardingFlow;
  docsLink?: string;
  locators: LocatorClient;
}

const createCardConfig = (
  onboardingFlow: OnboardingFlow,
  locators: LocatorClient,
  docsLink?: string
): NoDataCardComponentProps => {
  const onboardingLocator = locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  switch (onboardingFlow) {
    case OnboardingFlow.Hosts: {
      return {
        title: i18n.translate('xpack.infra.hostsViewPage.noData.page.title', {
          defaultMessage: 'Detect and resolve problems with your hosts',
        }),
        description: i18n.translate('xpack.infra.hostsViewPage.noData.card.description', {
          defaultMessage:
            'Start collecting data for your hosts to understand metric trends, explore logs and deep insight into their performance',
        }),
        href: onboardingLocator?.getRedirectUrl({ category: onboardingFlow }),
        buttonText: i18n.translate('xpack.infra.hostsViewPage.noData.card.buttonLabel', {
          defaultMessage: 'Add data',
        }),
        docsLink,
      };
    }
    default: {
      return {
        title: noMetricIndicesPromptTitle,
        description: noMetricIndicesPromptDescription,
        href: onboardingLocator?.getRedirectUrl({}),
        buttonText: i18n.translate('xpack.infra.hostsViewPage.noData.card.buttonLabel', {
          defaultMessage: 'Add data',
        }),
        docsLink,
      };
    }
  }
};

const getNoDataConfigDetails = ({
  onboardingFlow,
  locators,
  docsLink,
}: NoDataConfigDetails): NoDataConfig => {
  return {
    action: {
      beats: {
        ...createCardConfig(onboardingFlow, locators, docsLink),
      },
    },
  };
};

export const getNoDataConfig = ({
  hasData,
  loading,
  locators,
  onboardingFlow,
  docsLink,
}: {
  hasData: boolean;
  loading: boolean;
  onboardingFlow?: OnboardingFlow;
  locators: LocatorClient;
  docsLink?: string;
}): NoDataConfig | undefined => {
  if (!onboardingFlow || hasData || loading) {
    return;
  }

  return getNoDataConfigDetails({ onboardingFlow, locators, docsLink });
};
