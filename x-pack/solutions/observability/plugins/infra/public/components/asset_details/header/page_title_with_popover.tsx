/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiText, EuiLink, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { APM_HOST_TROUBLESHOOTING_LINK } from '../constants';
import { Popover } from '../tabs/common/popover';
import { useMetadataStateContext } from '../hooks/use_metadata_state';

export const PageTitleWithPopover = ({ name }: { name: string }) => {
  const { metadata, loading } = useMetadataStateContext();

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{name}</EuiFlexItem>
      {loading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        !metadata?.hasSystemIntegration && (
          <EuiFlexItem grow={false}>
            <Popover
              icon="questionInCircle"
              data-test-subj="assetDetailsTitleHasSystemMetricsPopover"
            >
              <EuiText size="xs">
                <p>
                  <FormattedMessage
                    id="xpack.infra.assetDetails.title.tooltip.apmHostMessage"
                    defaultMessage="This host has been detected by {apm}"
                    values={{
                      apm: (
                        <EuiLink
                          data-test-subj="assetDetailsTitleTooltipApmDocumentationLink"
                          href=" https://www.elastic.co/guide/en/observability/current/apm.html"
                          target="_blank"
                        >
                          <FormattedMessage
                            id="xpack.infra.assetDetails.title.tooltip.apmHostMessage.apmDocumentationLink"
                            defaultMessage="APM"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
                <p>
                  <EuiLink
                    data-test-subj="assetDetailsTitleHasSystemMetricsLearnMoreLink"
                    href={APM_HOST_TROUBLESHOOTING_LINK}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.assetDetails.title.tooltip.learnMoreLink"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                </p>
              </EuiText>
            </Popover>
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );
};
