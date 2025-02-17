/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SearchEmptyPrompt, DecorativeHorizontalStepper, EuiIconWeb } from '@kbn/search-shared-ui';

import { GithubIcon } from '../../../shared/icons/github_icon';

export const SelfManagedWebCrawlerEmptyPrompt: React.FC = () => {
  return (
    <SearchEmptyPrompt
      icon={EuiIconWeb}
      title={i18n.translate('xpack.enterpriseSearch.webCrawlersEmpty.title', {
        defaultMessage: 'Set up a web crawler',
      })}
      description={i18n.translate('xpack.enterpriseSearch.webCrawlersEmpty.description', {
        defaultMessage:
          "To set up and deploy a web crawler you'll be working between data source, your terminal, and the Kibana UI. The high level process looks like this:",
      })}
      body={
        <EuiFlexGroup
          alignItems="stretch"
          justifyContent="center"
          direction="column"
          gutterSize="s"
        >
          <EuiFlexItem>
            <EuiPanel color="subdued">
              <EuiFlexItem grow={false}>
                <DecorativeHorizontalStepper stepCount={3} />
              </EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
                    <EuiFlexGroup
                      gutterSize="s"
                      direction="row"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <EuiFlexItem grow={false}>
                        <EuiIcon color="primary" size="l" type={EuiIconWeb} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiIcon size="m" type="sortRight" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiIcon color="primary" size="l" type="launch" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiText>
                        <p>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.webCrawlersEmpty.guideTwoDescription"
                            defaultMessage="Deploy web crawler code on your own infrastructure by running from {source}, or using {docker}"
                            values={{
                              source: (
                                <EuiLink
                                  target="_blank"
                                  data-test-subj="enterpriseSearchEmptyConnectorsPromptSourceLink"
                                  href={'https://github.com/elastic/crawler'}
                                >
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.webCrawlersEmpty.sourceLabel',
                                    { defaultMessage: 'source' }
                                  )}
                                </EuiLink>
                              ),
                              docker: (
                                <EuiLink
                                  target="_blank"
                                  data-test-subj="enterpriseSearchEmptyConnectorsPromptDockerLink"
                                  href={
                                    'https://github.com/elastic/crawler?tab=readme-ov-file#running-open-crawler-with-docker'
                                  }
                                >
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.webCrawlersEmpty.dockerLabel',
                                    { defaultMessage: 'Docker' }
                                  )}
                                </EuiLink>
                              ),
                            }}
                          />
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup
                        justifyContent="center"
                        alignItems="center"
                        direction="row"
                        gutterSize="s"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiIcon color="primary" size="l" type="globe" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText>
                        <p>
                          {i18n.translate(
                            'xpack.enterpriseSearch.webCrawlersEmpty.guideOneDescription',
                            {
                              defaultMessage: 'Set one or more domain URLs you want to crawl',
                            }
                          )}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup
                        gutterSize="s"
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <EuiFlexItem>
                          <EuiIcon color="primary" size="l" type="globe" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon size="m" type="sortRight" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon color="primary" size="l" type={EuiIconWeb} />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon size="m" type="sortRight" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon color="primary" size="l" type="logoElasticsearch" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText>
                        <p>
                          {i18n.translate(
                            'xpack.enterpriseSearch.webCrawlersEmpty.guideThreeDescription',
                            {
                              defaultMessage:
                                'Configure your web crawler and connect it to Elasticsearch',
                            }
                          )}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      actions={
        <>
          <EuiFlexItem>
            <EuiButton
              data-test-subj="enterpriseSearchEmptyConnectorsPromptCreateSelfManagedConnectorButton"
              fill
              iconType={GithubIcon}
              href={'https://github.com/elastic/crawler'}
              target="_blank"
            >
              {i18n.translate('xpack.enterpriseSearch.webCrawlersEmpty.selfManagedButton', {
                defaultMessage: 'Self-managed web crawler',
              })}
            </EuiButton>
          </EuiFlexItem>
        </>
      }
    />
  );
};
