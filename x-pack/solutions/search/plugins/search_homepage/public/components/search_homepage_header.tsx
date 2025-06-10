/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPageTemplate, EuiImage, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import SearchHomePageImage from '../assets/search_homepage.svg';

export interface SearchHomepageHeaderProps {
  showEndpointsAPIKeys: boolean;
}

export const SearchHomepageHeader = ({ showEndpointsAPIKeys }: SearchHomepageHeaderProps) => (
  <EuiPageTemplate.Header
    data-test-subj="search-homepage-header"
    pageTitle={i18n.translate('xpack.searchHomepage.pageTitle', {
      defaultMessage: 'Your vector database just got faster',
    })}
    description={
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          {i18n.translate('xpack.searchHomepage.description', {
            defaultMessage:
              'Elasticsearch and Lucene now offer “Better binary quantization”, delivering ~95% memory reduction while maintaining high ranking quality.',
          })}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="checkInCircleFilled" color="primary" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                    defaultMessage: 'Feature update',
                  })}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="checkInCircleFilled" color="primary" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                    defaultMessage: 'Feature update',
                  })}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="checkInCircleFilled" color="primary" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                    defaultMessage: 'Feature update',
                  })}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
    rightSideItems={[<EuiImage size="xl" url={SearchHomePageImage} alt="" />]}
  />
);
