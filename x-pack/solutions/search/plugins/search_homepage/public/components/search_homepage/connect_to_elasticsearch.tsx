/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { css } from '@emotion/react';
import { FormInfoField } from '@kbn/search-shared-ui';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { useKibana } from '../../hooks/use_kibana';

export const ConnectToElasticsearch = () => {
  const elasticsearchUrl = useElasticsearchUrl();
  const { share } = useKibana().services;
  const locator = share?.url?.locators.get('MANAGEMENT_APP_LOCATOR');
  const manageKeysLink = locator?.useUrl({ sectionId: 'security', appId: 'api_keys' });

  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <p>
            {i18n.translate('xpack.searchHomepage.connectToElasticsearch.p.endpointLabel', {
              defaultMessage: 'Endpoint:',
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <FormInfoField
              value={elasticsearchUrl}
              copyValue={elasticsearchUrl}
              dataTestSubj="endpointValueField"
              copyValueDataTestSubj="copyEndpointButton"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem
        css={css({
          borderLeft: euiTheme.colors.borderBaseSubdued,
        })}
      >
        <EuiButton
          data-test-subj="searchHomepageConnectToElasticsearchApiKeysButton"
          href={manageKeysLink}
          color="text"
          iconType="plusInCircle"
          target="_blank"
          size="s"
        >
          <FormattedMessage
            id="xpack.searchHomepage.connectToElasticsearch.apiKeysButtonEmptyLabel"
            defaultMessage="API keys"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
