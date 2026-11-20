/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApiKeyForm } from '@kbn/search-api-keys-components';
import { FormInfoField } from '@kbn/search-shared-ui';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import type { AnalyticsPageId } from './page_ids';
import { getPageTestSubj } from './page_ids';

/** What an application needs to send data: the Elasticsearch endpoint and an API key. */
export const ConnectionDetails = ({
  page,
  placement = '',
}: {
  page: AnalyticsPageId;
  /** Tells the details apart where a dialog shows them over a page that has them too. */
  placement?: string;
}): React.JSX.Element => {
  const elasticsearchUrl = useElasticsearchUrl();
  const getTestSubj = (name: string): string => getPageTestSubj(page, `${placement}${name}`);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj={getTestSubj('ConnectionDetails')}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.searchHomepage.analytics.connectionDetails.prompt', {
              defaultMessage: 'To send data from your own code, use this endpoint and API key.',
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <FormInfoField
              label={i18n.translate(
                'xpack.searchHomepage.analytics.connectionDetails.endpointLabel',
                { defaultMessage: 'Endpoint' }
              )}
              value={elasticsearchUrl}
              copyValue={elasticsearchUrl}
              dataTestSubj={getTestSubj('EndpointValue')}
              copyValueDataTestSubj={getTestSubj('CopyEndpoint')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ApiKeyForm />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
