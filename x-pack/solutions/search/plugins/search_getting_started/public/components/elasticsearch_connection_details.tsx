/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiIconTip, EuiButtonEmpty } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { ApiKeyForm } from '@kbn/search-api-keys-components';
import { FormInfoField } from '@kbn/search-shared-ui';
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';

export const ElasticsearchConnectionDetails = () => {
  const elasticsearchUrl = useElasticsearchUrl();

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                {i18n.translate(
                  'xpack.search.gettingStarted.elasticsearchConnectionDetails.endpointLabel',
                  {
                    defaultMessage: 'Elasticsearch endpoint:',
                  }
                )}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate(
                'xpack.search.gettingStarted.elasticsearchConnectionDetails.endpointTooltip',
                {
                  defaultMessage:
                    'The Elasticsearch endpoint is the URL for your Elasticsearch cluster.',
                }
              )}
              position="right"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <FormInfoField
              value={elasticsearchUrl}
              copyValue={elasticsearchUrl}
              dataTestSubj="endpointValueField"
              copyValueDataTestSubj="copyEndpointButton"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ApiKeyForm hasTitle={false} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div>
              <EuiButtonEmpty
                data-test-subj="viewConnectionDetailsLink"
                iconType="plugs"
                iconSide="left"
                target="_blank"
                onClick={() => openWiredConnectionDetails()}
                color="text"
                aria-label={i18n.translate(
                  'xpack.search.gettingStarted.elasticsearchConnectionDetails.viewDetails',
                  {
                    defaultMessage: 'View connection details',
                  }
                )}
              >
                {i18n.translate(
                  'xpack.search.gettingStarted.elasticsearchConnectionDetails.viewDetails',
                  {
                    defaultMessage: 'View connection details',
                  }
                )}
              </EuiButtonEmpty>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
