/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiShowFor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { css } from '@emotion/react';
import { FormInfoField } from '@kbn/search-shared-ui';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useSearchApiKey, Status } from '@kbn/search-api-keys-components';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';

export const ConnectToElasticsearch = () => {
  const elasticsearchUrl = useElasticsearchUrl();

  const { status } = useSearchApiKey();
  const hasAPIKeyManagePermissions = useMemo(() => {
    return status !== Status.showUserPrivilegesError;
  }, [status]);

  return (
    <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="s">
      <EuiShowFor sizes={['l', 'xl']}>
        <EuiFlexItem grow={false} css={css({ flexBasis: '100%' })}>
          <EuiText color="subdued" size="s">
            <p>
              {i18n.translate('xpack.searchHomepage.connectToElasticsearch.p.endpointLabel', {
                defaultMessage: 'Elasticsearch:',
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
      </EuiShowFor>
      <EuiShowFor sizes={['xl']}>
        <EuiFlexItem>
          <EuiButton
            data-test-subj="searchHomepageConnectToElasticsearchApiKeysButton"
            color="text"
            iconType="plusInCircle"
            size="s"
            onClick={() =>
              openWiredConnectionDetails({
                props: { options: { defaultTabId: 'apiKeys' } },
              })
            }
            disabled={!hasAPIKeyManagePermissions}
          >
            <FormattedMessage
              id="xpack.searchHomepage.connectToElasticsearch.apiKeysButtonEmptyLabel"
              defaultMessage="API keys"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiShowFor>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          display="base"
          size="s"
          iconSize="m"
          iconType="plugs"
          onClick={() => openWiredConnectionDetails()}
          data-test-subj="searchHomepageConnectToElasticsearchConnectionDetailsButton"
          color="text"
          aria-label={i18n.translate(
            'xpack.searchHomepage.searchHomepagePage.euiButtonIcon.connectionDetailsPressToLabel',
            {
              defaultMessage: 'Show connection details for connecting to the Elasticsearch API',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
