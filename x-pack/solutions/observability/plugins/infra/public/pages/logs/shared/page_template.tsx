/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSection } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { NoDataPage } from '@kbn/shared-ux-page-no-data';
import React, { useEffect } from 'react';
import { filledPageSectionContentCss } from '../../../components/empty_states/layout';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

const headerPageBodyCss = css`
  padding-top: 0;
`;

export interface LogsPageTemplateProps extends LazyObservabilityPageTemplateProps {
  hasData?: boolean;
  header?: React.ReactNode;
  isDataLoading?: boolean;
}

export const LogsPageTemplate: React.FC<LogsPageTemplateProps> = ({
  hasData = true,
  header,
  isDataLoading = false,
  isEmptyState,
  pageSectionProps,
  children,
  'data-test-subj': _dataTestSubj,
  ...pageTemplateProps
}) => {
  const {
    services: {
      observabilityAIAssistant,
      observabilityShared: {
        navigation: { PageTemplate },
      },
      share,
      docLinks,
    },
  } = useKibanaContextForPlugin();

  const onboardingLocator = share.url.locators.get(OBSERVABILITY_ONBOARDING_LOCATOR);
  const href = onboardingLocator?.getRedirectUrl({ category: 'logs' });
  const { setScreenContext } = observabilityAIAssistant?.service || {};

  useEffect(() => {
    return setScreenContext?.({
      starterPrompts: [
        ...(!isDataLoading && !hasData
          ? [
              {
                title: i18n.translate(
                  'xpack.infra.aiAssistant.starterPrompts.explainNoData.title',
                  {
                    defaultMessage: 'Explain',
                  }
                ),
                prompt: i18n.translate(
                  'xpack.infra.aiAssistant.starterPrompts.explainNoData.prompt',
                  {
                    defaultMessage: "Why don't I see any data?",
                  }
                ),
                icon: 'sparkles',
              },
            ]
          : []),
      ],
    });
  }, [hasData, isDataLoading, setScreenContext]);

  const noDataConfig: NoDataConfig | undefined = hasData
    ? undefined
    : {
        action: {
          beats: {
            title: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.title', {
              defaultMessage: 'Add a logging integration',
            }),
            description: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.description', {
              defaultMessage:
                'Use the Elastic Agent or Beats to send logs to Elasticsearch. We make it easy with integrations for many popular systems and apps.',
            }),
            href,
            buttonText: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.buttonLabel', {
              defaultMessage: 'Add a logging integration',
            }),
            docsLink: docLinks.links.observability.guide,
            'data-test-subj': 'beatsNoDataCard',
          },
        },
      };

  // Template noDataConfig replaces children. When AppHeader is mounted, render the
  // onboarding card as body instead so Alerts and Add data stay available.
  const showOnboarding = Boolean(header) && !hasData && !isDataLoading && noDataConfig;
  const pinHeaderOnEmpty = Boolean(header) && Boolean(isEmptyState) && !showOnboarding;
  const pinHeader = Boolean(header);

  return (
    <PageTemplate
      data-test-subj={hasData ? _dataTestSubj : 'noDataPage'}
      noDataConfig={header ? undefined : noDataConfig}
      isPageDataLoaded={isDataLoading === false}
      isEmptyState={pinHeader ? undefined : isEmptyState}
      pageSectionProps={
        pinHeader
          ? {
              paddingSize: 'none',
              contentProps: {
                css: filledPageSectionContentCss,
              },
              ...pageSectionProps,
            }
          : pageSectionProps
      }
      {...pageTemplateProps}
    >
      {header}
      {showOnboarding && noDataConfig ? (
        <NoDataPage {...noDataConfig} />
      ) : pinHeaderOnEmpty ? (
        <EuiPageSection alignment="center" grow>
          {children}
        </EuiPageSection>
      ) : pinHeader ? (
        <EuiPageSection
          paddingSize="l"
          restrictWidth={false}
          contentProps={{ css: headerPageBodyCss }}
        >
          {children}
        </EuiPageSection>
      ) : (
        children
      )}
    </PageTemplate>
  );
};
