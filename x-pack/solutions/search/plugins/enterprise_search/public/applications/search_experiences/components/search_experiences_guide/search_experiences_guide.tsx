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
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiImage,
  EuiHorizontalRule,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { SEARCH_EXPERIENCES_PLUGIN } from '../../../../../common/constants';
import searchExperiencesIllustration from '../../../../assets/images/search_experiences.svg';

import { SetSearchExperiencesChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchSearchExperiencesPageTemplate } from '../layout';

export const SearchExperiencesGuide: React.FC = () => {
  return (
    <EnterpriseSearchSearchExperiencesPageTemplate
      restrictWidth
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.searchExperiences.guide.pageTitle', {
          defaultMessage: 'Build a search experience with Search UI',
        }),
      }}
    >
      <SetPageChrome />
      <EuiPanel color="transparent" paddingSize="none">
        <EuiFlexGroup
          className="addContentEmptyPrompt"
          justifyContent="spaceBetween"
          direction="row"
          responsive
        >
          <EuiFlexItem grow>
            <EuiFlexGroup direction="column" justifyContent="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h2>About Search UI</h2>
                </EuiTitle>
                <EuiSpacer size="l" />
                <EuiText grow={false}>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.searchExperiences.guide.description"
                      defaultMessage="Search UI is a JavaScript library for implementing world-class search experiences without reinventing the wheel. It works out of the box with Elasticsearch, App Search, and Workplace Search, so you can focus on building the best experience for your users, customers, and employees."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      href={SEARCH_EXPERIENCES_PLUGIN.DOCUMENTATION_URL}
                      target="_blank"
                      color="primary"
                      fill
                      iconType={'popout'}
                      iconSide="right"
                    >
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchExperiences.guide.documentationLink"
                        defaultMessage="Visit the Search UI documentation"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      href={SEARCH_EXPERIENCES_PLUGIN.GITHUB_URL}
                      target="_blank"
                      iconType={'popout'}
                      iconSide="right"
                    >
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchExperiences.guide.githubLink"
                        defaultMessage="Search UI on Github"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h2>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.searchExperiences.guide.featuresTitle"
                      defaultMessage="Features"
                    />
                  </h2>
                </EuiTitle>
                <EuiSpacer size="l" />
                <EuiText grow={false}>
                  <ul>
                    <li>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchExperiences.guide.features.1"
                        defaultMessage="You know, for search. Elastic builds and maintains Search UI."
                      />
                    </li>
                    <li>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchExperiences.guide.features.2"
                        defaultMessage="Build a complete search experience quickly with a few lines of code."
                      />
                    </li>
                    <li>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchExperiences.guide.features.3"
                        defaultMessage="Search UI is highly customizable, so you can build the perfect search experience for your users."
                      />
                    </li>
                    <li>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchExperiences.guide.features.4"
                        defaultMessage="Searches, paging, filtering, and more, are captured in the URL for direct result linking."
                      />
                    </li>
                    <li>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchExperiences.guide.features.5"
                        defaultMessage="Not just for React. Use with any JavaScript library, even vanilla JavaScript."
                      />
                    </li>
                  </ul>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiImage
              size="xl"
              float="right"
              src={searchExperiencesIllustration}
              alt="Search experiences illustration"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xxl" />
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.enterpriseSearch.searchExperiences.guide.tutorialsTitle"
              defaultMessage="Get started quickly with a tutorial"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xl" />
        <EuiFlexGroup responsive>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xl" type="logoElasticsearch" />}
              title="Elasticsearch"
              description={i18n.translate(
                'xpack.enterpriseSearch.searchExperiences.guide.tutorials.elasticsearch.description',
                {
                  defaultMessage: 'Build a search experience with Elasticsearch and Search UI.',
                }
              )}
              href={SEARCH_EXPERIENCES_PLUGIN.ELASTICSEARCH_TUTORIAL_URL}
              target="_blank"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xl" type="logoAppSearch" />}
              title="App Search"
              description={i18n.translate(
                'xpack.enterpriseSearch.searchExperiences.guide.tutorials.appSearch.description',
                {
                  defaultMessage: 'Build a search experience with App Search and Search UI.',
                }
              )}
              href={SEARCH_EXPERIENCES_PLUGIN.APP_SEARCH_TUTORIAL_URL}
              target="_blank"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xl" type="logoWorkplaceSearch" />}
              title="Workplace Search"
              description={i18n.translate(
                'xpack.enterpriseSearch.searchExperiences.guide.tutorials.workplaceSearch.description',
                {
                  defaultMessage: 'Build a search experience with Workplace Search and Search UI.',
                }
              )}
              href={SEARCH_EXPERIENCES_PLUGIN.WORKPLACE_SEARCH_TUTORIAL_URL}
              target="_blank"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EnterpriseSearchSearchExperiencesPageTemplate>
  );
};
