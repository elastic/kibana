/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiPageTemplate,
  EuiTitle,
  EuiImage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import SearchHomePageImage from '../assets/search_homepage.png';

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
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" direction="column">
        <EuiFlexItem>
          {i18n.translate('xpack.searchHomepage.description', {
            defaultMessage:
              'Elasticsearch and Lucene now offer “Better binary quantization”, delivering ~95% memory reduction while maintaining high ranking quality.',
          })}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
                <EuiIcon type="checkInCircleFilled" color="primary" />
                <small>
                  {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                    defaultMessage: 'Feature update',
                  })}
                </small>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
                <EuiIcon type="checkInCircleFilled" color="primary" />
                <small>
                  {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                    defaultMessage: 'Feature update',
                  })}
                </small>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
                <EuiIcon type="checkInCircleFilled" color="primary" />
                <small>
                  {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                    defaultMessage: 'Feature update',
                  })}
                </small>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
    rightSideItems={[<EuiImage size="fullWidth" url={SearchHomePageImage} alt="" />]}
  />
);
