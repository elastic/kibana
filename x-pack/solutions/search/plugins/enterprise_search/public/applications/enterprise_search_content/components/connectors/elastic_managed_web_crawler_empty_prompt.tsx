/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SearchEmptyPrompt, DecorativeHorizontalStepper, EuiIconWeb } from '@kbn/search-shared-ui';

import { BACK_BUTTON_LABEL, COMING_SOON_LABEL } from '../../../shared/constants';
import { KibanaLogic } from '../../../shared/kibana';
import { CRAWLERS_PATH } from '../../routes';

export const ElasticManagedWebCrawlerEmptyPrompt: React.FC = () => {
  return (
    <SearchEmptyPrompt
      backButton={{
        label: BACK_BUTTON_LABEL,
        onClickBack: () => KibanaLogic.values.navigateToUrl(CRAWLERS_PATH),
      }}
      icon={EuiIconWeb}
      title={i18n.translate('xpack.enterpriseSearch.elasticManagedWebCrawlerEmpty.title', {
        defaultMessage: 'Elastic managed web crawlers',
      })}
      isComingSoon
      comingSoonLabel={COMING_SOON_LABEL}
      description={i18n.translate(
        'xpack.enterpriseSearch.elasticManagedWebCrawlerEmpty.description',
        {
          defaultMessage:
            "We're actively developing Elastic managed web crawlers, that won't require any self-managed infrastructure. You'll be able to handle all configuration in the UI. This will simplify syncing your data into a serverless Elasticsearch project. This new workflow will have two steps:",
        }
      )}
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
                <DecorativeHorizontalStepper stepCount={2} />
              </EuiFlexItem>
              <EuiFlexGroup>
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
                            'xpack.enterpriseSearch.elasticManagedWebCrawlerEmpty.guideOneDescription',
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
                          <EuiIcon color="primary" size="l" type={EuiIconWeb} />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon color="primary" size="l" type="logoElastic" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText>
                        <p>
                          {i18n.translate(
                            'xpack.enterpriseSearch.elasticManagedWebCrawlerEmpty.guideThreeDescription',
                            {
                              defaultMessage: 'Configure all the web crawler process using Kibana',
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
    />
  );
};
