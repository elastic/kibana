/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionListTitle, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import type { MetadataData } from './metadata_summary_list';
import { Popover } from '../../common/popover';

const columnTitles = {
  hostIp: i18n.translate('xpack.infra.assetDetails.overview.metadataHostIpHeading', {
    defaultMessage: 'Host IP',
  }),
  hostOsVersion: i18n.translate('xpack.infra.assetDetails.overview.metadataHostOsVersionHeading', {
    defaultMessage: 'Host OS version',
  }),
  hostName: i18n.translate('xpack.infra.assetDetails.overview.metadataHostNameHeading', {
    defaultMessage: 'Host name',
  }),
  cloudProvider: i18n.translate('xpack.infra.assetDetails.overview.metadataCloudProviderHeading', {
    defaultMessage: 'Cloud provider',
  }),
  cloudInstanceId: i18n.translate(
    'xpack.infra.assetDetails.overview.metadataCloudInstanceIdHeading',
    {
      defaultMessage: 'Cloud instance ID',
    }
  ),
  cloudImageId: i18n.translate('xpack.infra.assetDetails.overview.metadataCloudImageIdHeading', {
    defaultMessage: 'Cloud image ID',
  }),
  operatingSystem: i18n.translate(
    'xpack.infra.assetDetails.overview.metadataOperatingSystemHeading',
    {
      defaultMessage: 'Operating system',
    }
  ),
  containerId: i18n.translate('xpack.infra.assetDetails.overview.metadataContainerIdHeading', {
    defaultMessage: 'Container ID',
  }),
  containerImageName: i18n.translate(
    'xpack.infra.assetDetails.overview.metadataContainerImageNameHeading',
    {
      defaultMessage: 'Container image name',
    }
  ),
  runtime: i18n.translate('xpack.infra.assetDetails.overview.metadataRuntimeHeading', {
    defaultMessage: 'Runtime',
  }),
};

type MetadataFields = 'hostIp' | 'hostOsVersion';

interface MetadataSummaryProps {
  metadataValue: MetadataData;
}

export const MetadataHeader = ({ metadataValue }: MetadataSummaryProps) => {
  return (
    <EuiDescriptionListTitle
      css={css`
        white-space: nowrap;
      `}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {columnTitles[metadataValue.field as MetadataFields]}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Popover icon="iInCircle" data-test-subj="infraAssetDetailsMetadataSummaryPopoverButton">
            <EuiText size="xs">
              {metadataValue.tooltipLink ? (
                <FormattedMessage
                  id="xpack.infra.assetDetails.overviewMetadata.tooltip.documentationLabel"
                  defaultMessage="See {documentation} for more details."
                  values={{
                    documentation: (
                      <EuiLink
                        data-test-subj="infraAssetDetailsTooltipMetadataDocumentationLink"
                        href={metadataValue.tooltipLink}
                        target="_blank"
                      >
                        <code>{metadataValue.tooltipFieldLabel}</code>
                      </EuiLink>
                    ),
                  }}
                />
              ) : (
                <code>{metadataValue.tooltipFieldLabel}</code>
              )}
            </EuiText>
          </Popover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDescriptionListTitle>
  );
};
