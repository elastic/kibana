/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { TrialUsageBadge } from '@kbn/shared-components';
import { ConnectToProject, useOnboardingCredentials } from '@kbn/vectordb-onboarding';
import { i18n } from '@kbn/i18n';
import { useDeploymentStats } from '../hooks/use_deployment_stats';
import { HomePageBanner } from './home_page_banner';
import { HomePageStatPanel } from './home_page_stat_panel';
import { getDataCard, getSecondaryCards } from './home_page_stat_cards';
import { AddDataSection } from './add_data_section';
import { ChatWithYourDataSection } from './chat_with_data_section';
import { useKibana } from '../hooks/use_kibana';
import { useAuthenticatedUser } from '../hooks/use_authenticated_user';

export const HomePage = () => {
  const {
    services: { cloud, application, docLinks },
  } = useKibana();
  const { user } = useAuthenticatedUser();
  const { stats, isLoading } = useDeploymentStats();
  const { elasticsearchUrl, apiKey, isLoading: isCredentialsLoading } = useOnboardingCredentials();
  const hasData = stats.indicesCount !== 0 || (stats.vectorCount ?? 0) > 0;

  const username = user?.full_name || user?.email;
  const vectorDatabaseDocsUrl = docLinks.links.enterpriseSearch.vectorDatabaseFullTextSearch;

  const statCardDeps = { application, stats, isLoading };
  const dataCard = getDataCard(statCardDeps);
  const secondaryCards = getSecondaryCards(statCardDeps);

  return (
    <EuiPageTemplate restrictWidth panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              responsive={false}
              wrap
              alignItems="center"
              gutterSize="s"
              data-test-subj="vectordbHomepageHeaderLeftsideGroup"
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h1>
                    {username
                      ? i18n.translate('xpack.serverlessVectordb.home.welcome.title', {
                          defaultMessage: 'Welcome, {username}',
                          values: { username },
                        })
                      : i18n.translate('xpack.serverlessVectordb.home.welcome.defaultTitle', {
                          defaultMessage: 'Welcome',
                        })}
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
              {cloud?.isInTrial() && (
                <EuiFlexItem grow={false}>
                  <TrialUsageBadge cloud={cloud} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectToProject
              elasticsearchUrl={elasticsearchUrl}
              apiKey={apiKey}
              isLoading={isCredentialsLoading}
              showLabel={false}
              isCompact
              telemetryPage="homePage"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="none" />

        <EuiFlexGroup gutterSize="l" direction="column">
          <EuiFlexItem>
            <HomePageBanner hasData={hasData} isLoading={isLoading} />
          </EuiFlexItem>

          <EuiFlexItem>
            <HomePageStatPanel {...dataCard} newIndex={stats.newIndex} />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFlexGroup gutterSize="l">
              {secondaryCards.map((card) => (
                <EuiFlexItem key={card.testSubj}>
                  <HomePageStatPanel {...card} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiSpacer size="s" />

          {/* Add data / Chat with your data */}
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem>
                <AddDataSection />
              </EuiFlexItem>
              <EuiFlexItem>
                <ChatWithYourDataSection />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="l" />
        <EuiLink
          href={vectorDatabaseDocsUrl}
          target="_blank"
          external
          data-test-subj="vectordbHomepageDocumentationLink"
          data-telemetry-id="serverlessVectordb-home-documentationLink"
        >
          {i18n.translate('xpack.serverlessVectordb.home.learnMoreLink', {
            defaultMessage: 'Learn more about Elasticsearch Vector Database',
          })}
        </EuiLink>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
