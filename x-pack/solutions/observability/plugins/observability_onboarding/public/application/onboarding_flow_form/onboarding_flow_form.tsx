/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FunctionComponent } from 'react';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  useEuiTheme,
  EuiBadge,
  EuiFlexGrid,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useSearchParams } from 'react-router-dom-v5-compat';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { PackageListSearchForm } from '../package_list_search_form/package_list_search_form';
import { Category } from './types';
import { useCustomCards } from './use_custom_cards';
import { LogoIcon, SupportedLogo } from '../shared/logo_icon';
import { ObservabilityOnboardingAppServices } from '../..';
import { PackageList } from '../package_list/package_list';

interface UseCaseOption {
  id: Category;
  label: string;
  description: React.ReactNode;
  logos?: SupportedLogo[];
  showIntegrationsBadge?: boolean;
}

export const OnboardingFlowForm: FunctionComponent = () => {
  const options: UseCaseOption[] = [
    {
      id: 'host',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.hostLabel',
        { defaultMessage: 'Host' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.hostDescription',
        {
          defaultMessage:
            'Monitor your host and the services running on it, set-up SLO, get alerted, remediate performance issues',
        }
      ),
      logos: ['opentelemetry', 'apache', 'mysql'],
    },
    {
      id: 'kubernetes',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.kubernetesLabel',
        { defaultMessage: 'Kubernetes' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.kubernetesDescription',
        {
          defaultMessage:
            'Observe your Kubernetes cluster, and your container workloads using logs, metrics, traces and profiling data',
        }
      ),
      logos: ['kubernetes', 'opentelemetry'],
    },
    {
      id: 'application',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.applicationLabel',
        { defaultMessage: 'Application' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.applicationDescription',
        {
          defaultMessage:
            'Monitor the frontend and backend application that you have developed, set-up synthetic monitors',
        }
      ),
      logos: ['opentelemetry', 'java', 'ruby', 'dotnet'],
    },
    {
      id: 'cloud',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.cloudLabel',
        { defaultMessage: 'Cloud' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.cloudDescription',
        {
          defaultMessage: 'Ingest telemetry data from the Cloud for your applications and services',
        }
      ),
      logos: ['azure', 'aws', 'gcp'],
    },
  ];

  const {
    services: {
      context: { isCloud },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const radioGroupId = useGeneratedHtmlId({ prefix: 'onboardingCategory' });
  const categorySelectorTitleId = useGeneratedHtmlId();
  const packageListTitleId = useGeneratedHtmlId();

  const [searchParams, setSearchParams] = useSearchParams();

  const suggestedPackagesRef = useRef<HTMLDivElement | null>(null);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const [integrationSearch, setIntegrationSearch] = useState(searchParams.get('search') ?? '');
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const searchParam = searchParams.get('search') ?? '';
    if (integrationSearch === searchParam) return;
    const entries: Record<string, string> = Object.fromEntries(searchParams.entries());
    if (integrationSearch) {
      entries.search = integrationSearch;
    } else {
      delete entries.search;
    }
    setSearchParams(entries, { replace: true });
  }, [integrationSearch, searchParams, setSearchParams]);

  const createCollectionCardHandler = useCallback(
    (query: string) => () => {
      setIntegrationSearch(query);
      if (searchResultsRef.current) {
        setTimeout(
          scrollIntoViewWithOffset,
          40, // Adding slight delay to ensure DOM is updated before calculating scroll position
          searchResultsRef.current,
          parseInt(euiTheme.size.l, 10)
        );
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const featuredCardsForCategoryMap: Record<Category, string[]> = {
    host: ['auto-detect-logs', 'otel-logs'],
    kubernetes: ['kubernetes-quick-start', 'otel-kubernetes'],
    application: ['apm-virtual', 'otel-virtual', 'synthetics-virtual'],
    cloud: ['azure-logs-virtual', 'aws-logs-virtual', 'gcp-logs-virtual'],
  };
  const customCards = useCustomCards(createCollectionCardHandler);
  const featuredCardsForCategory: IntegrationCardItem[] = customCards.filter((card) => {
    const category = searchParams.get('category') as Category;

    if (category === null) {
      return false;
    }

    const cardList = featuredCardsForCategoryMap[category] ?? [];

    return cardList.includes(card.id);
  });

  /**
   * Cloud deployments have the new Firehose quick start
   * flow enabled, so the ond card 'epr:awsfirehose' should
   * not show up in the search results.
   */
  const searchExcludePackageIdList = isCloud ? ['epr:awsfirehose'] : [];

  let isSelectingCategoryWithKeyboard: boolean = false;

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiTitle size="s" id={categorySelectorTitleId}>
        <strong>
          {i18n.translate(
            'xpack.observability_onboarding.experimentalOnboardingFlow.strong.startCollectingYourDataLabel',
            {
              defaultMessage: 'What do you want to monitor?',
            }
          )}
        </strong>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGrid columns={2} role="group" aria-labelledby={categorySelectorTitleId}>
        {options.map((option) => (
          <EuiFlexItem
            key={option.id}
            data-test-subj={`observabilityOnboardingUseCaseCard-${option.id}`} // EuiCheckableCard does not forward `data-test-subj` prop so using parent element instead
          >
            <EuiCheckableCard
              id={`${radioGroupId}_${option.id}`}
              name={radioGroupId}
              label={
                <>
                  <EuiText>
                    <strong>{option.label}</strong>
                  </EuiText>
                  {/* The description and logo icons are passed into `label` prop instead of `children` to ensure they are clickable */}
                  <EuiSpacer size="s" />
                  <EuiText
                    color="subdued"
                    size="s"
                    css={css`
                      flex-grow: 1; // Allow the description to grow to fill the space
                    `}
                  >
                    {option.description}
                  </EuiText>
                  {(option.logos || option.showIntegrationsBadge) && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFlexGroup
                        gutterSize="m"
                        responsive={false}
                        css={css`
                          flex-grow: 0; // Prevent the logos from growing to align to the bottom
                        `}
                        aria-hidden // Hide from screen readers as the logos are mainly decorative
                      >
                        {option.logos?.map((logo) => (
                          <EuiFlexItem key={logo} grow={false}>
                            <LogoIcon logo={logo} size="l" />
                          </EuiFlexItem>
                        ))}
                        {option.showIntegrationsBadge && (
                          <EuiBadge color="hollow">
                            <FormattedMessage
                              defaultMessage="+ Integrations"
                              id="xpack.observability_onboarding.experimentalOnboardingFlow.form.addIntegrations"
                              description="A badge indicating that the user can add additional observability integrations to their deployment via this option"
                            />
                          </EuiBadge>
                        )}
                      </EuiFlexGroup>
                    </>
                  )}
                </>
              }
              checked={option.id === searchParams.get('category')}
              /**
               * onKeyDown and onKeyUp handlers disable
               * scrolling to the category items when user
               * changes the selected category using keyboard,
               * which prevents our custom scroll behavior
               * from conflicting with browser's native one to
               * put keyboard-focused item into the view.
               */
              onKeyDown={() => (isSelectingCategoryWithKeyboard = true)}
              onKeyUp={() => (isSelectingCategoryWithKeyboard = false)}
              onChange={() => {
                setIntegrationSearch('');
                setSearchParams({ category: option.id }, { replace: true });
              }}
              onClick={() => {
                if (!isSelectingCategoryWithKeyboard && suggestedPackagesRef.current) {
                  setTimeout(
                    scrollIntoViewWithOffset,
                    40, // Adding slight delay to ensure DOM is updated before calculating scroll position
                    suggestedPackagesRef.current,
                    parseInt(euiTheme.size.l, 10)
                  );
                }
              }}
              css={css`
                flex-grow: 1;

                & > .euiPanel {
                  display: flex;

                  & > .euiCheckableCard__label {
                    display: flex;
                    flex-direction: column;
                  }
                }
              `}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      {/* Hiding element instead of not rending these elements in order to preload available packages on page load */}
      <div
        hidden={featuredCardsForCategory.length === 0}
        role="group"
        aria-labelledby={packageListTitleId}
      >
        <EuiSpacer size="xxl" />
        <div ref={suggestedPackagesRef}>
          <EuiTitle size="s" id={packageListTitleId}>
            <strong>
              {searchParams.get('category') === 'kubernetes'
                ? i18n.translate(
                    'xpack.observability_onboarding.experimentalOnboardingFlow.kubernetesPackagesTitle',
                    {
                      defaultMessage: 'Monitor your Kubernetes cluster using:',
                    }
                  )
                : searchParams.get('category') === 'application'
                ? i18n.translate(
                    'xpack.observability_onboarding.experimentalOnboardingFlow.applicationPackagesTitle',
                    {
                      defaultMessage: 'Monitor your Application using:',
                    }
                  )
                : searchParams.get('category') === 'cloud'
                ? i18n.translate(
                    'xpack.observability_onboarding.experimentalOnboardingFlow.cloudPackagesTitle',
                    {
                      defaultMessage: 'Select your Cloud provider:',
                    }
                  )
                : i18n.translate(
                    'xpack.observability_onboarding.experimentalOnboardingFlow.hostPackagesTitle',
                    {
                      defaultMessage: 'Monitor your Host using:',
                    }
                  )}
            </strong>
          </EuiTitle>
          <EuiSpacer size="m" />
          <PackageList list={featuredCardsForCategory} />
        </div>
      </div>

      <div ref={searchResultsRef}>
        <EuiSpacer size="xxl" />
        <EuiText size="s" color="subdued">
          <strong>
            <FormattedMessage
              id="xpack.observability_onboarding.experimentalOnboardingFlow.form.searchPromptText"
              defaultMessage="Search through other ways of ingesting data:"
            />
          </strong>
        </EuiText>
        <EuiSpacer size="m" />
        <PackageListSearchForm
          searchQuery={integrationSearch}
          setSearchQuery={setIntegrationSearch}
          flowCategory={searchParams.get('category')}
          customCards={customCards.filter((card) => !card.isCollectionCard)}
          excludePackageIdList={searchExcludePackageIdList}
        />
      </div>
    </EuiPanel>
  );
};

function scrollIntoViewWithOffset(element: HTMLElement, offset = 0) {
  // Fixed header in Kibana is different height between serverless and stateful so need to calculate dynamically.
  const fixedHeaders = document.querySelectorAll('#globalHeaderBars [data-fixed-header=true]');
  fixedHeaders.forEach((header) => {
    offset += header.getBoundingClientRect().height;
  });

  window.scrollTo({
    behavior: 'smooth',
    top: element.getBoundingClientRect().top - document.body.getBoundingClientRect().top - offset,
  });
}
