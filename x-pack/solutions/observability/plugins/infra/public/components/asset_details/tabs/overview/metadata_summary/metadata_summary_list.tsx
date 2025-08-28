/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InfraMetadata } from '../../../../../../common/http_api';
import { NOT_AVAILABLE_LABEL } from '../../../translations';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../../types';
import { ExpandableContent } from '../../../components/expandable_content';
import { MetadataHeader } from './metadata_header';
import { MetadataExplanationMessage } from '../../../components/metadata_explanation';
import { SectionTitle } from '../../../components/section_title';
import { Section } from '../../../components/section';
import { getContainerMetadata, getHostMetadataBySchema } from './metadata_by_schema';

interface MetadataSummaryProps {
  metadata?: InfraMetadata;
  loading: boolean;
  entityType: InventoryItemType;
  schema: DataSchemaFormat | null;
}
interface MetadataSummaryWrapperProps {
  visibleMetadata: MetadataData[];
  loading: boolean;
  entityType: InventoryItemType;
  schema: DataSchemaFormat | null;
}

export interface MetadataData {
  field: string;
  value?: string | string[];
  tooltipFieldLabel: string;
  tooltipLink?: string;
}

const MetadataSummaryListWrapper = ({
  loading: metadataLoading,
  visibleMetadata,
  entityType,
  schema,
}: MetadataSummaryWrapperProps) => {
  const { showTab } = useTabSwitcherContext();

  const onClick = () => {
    showTab(ContentTabIds.METADATA);
  };

  return (
    <Section
      title={
        <SectionTitle
          title={
            <FormattedMessage
              id="xpack.infra.assetDetails.overview.metadataSectionTitle"
              defaultMessage="Metadata"
            />
          }
          data-test-subj="infraAssetDetailsMetadataTitle"
        />
      }
      collapsible
      data-test-subj="infraAssetDetailsMetadataCollapsible"
      id="metadata"
      extraAction={
        <EuiButtonEmpty
          aria-label={i18n.translate(
            'xpack.infra.assetDetails.metadataSummary.showAllMetadataButton.ariaLabel',
            {
              defaultMessage: 'Show all metadata',
            }
          )}
          data-test-subj="infraAssetDetailsMetadataShowAllButton"
          onClick={onClick}
          size="xs"
          flush="both"
          iconSide="right"
          iconType="sortRight"
          key="metadata-link"
        >
          <FormattedMessage
            id="xpack.infra.assetDetails.metadataSummary.showAllMetadataButton"
            defaultMessage="Show all"
          />
        </EuiButtonEmpty>
      }
    >
      <>
        <MetadataExplanationMessage entityType={entityType} schema={schema} />
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          {visibleMetadata
            .filter((metadataValue) => metadataValue)
            .map((metadataValue) => (
              <EuiFlexItem key={metadataValue.field} grow={false} css={{ width: '200px' }}>
                <EuiDescriptionList data-test-subj="infraMetadataSummaryItem" compressed>
                  <MetadataHeader metadataValue={metadataValue} />
                  <EuiDescriptionListDescription>
                    {metadataLoading && !metadataValue.value ? (
                      <EuiLoadingSpinner />
                    ) : (
                      <ExpandableContent values={metadataValue.value ?? NOT_AVAILABLE_LABEL} />
                    )}
                  </EuiDescriptionListDescription>
                </EuiDescriptionList>
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
      </>
    </Section>
  );
};
export const MetadataSummaryList = ({
  metadata,
  loading,
  entityType,
  schema,
}: MetadataSummaryProps) => {
  const host = getHostMetadataBySchema(metadata?.info, schema);
  const container = getContainerMetadata(metadata?.info);

  switch (entityType) {
    case 'host':
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={[...host.metadata, ...host.extended]}
          loading={loading}
          entityType={entityType}
          schema={schema}
        />
      );
    case 'container':
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={[...container.metadata, ...container.extended]}
          loading={loading}
          entityType={entityType}
          schema={schema}
        />
      );
    default:
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={[]}
          loading={loading}
          entityType={entityType}
          schema={schema}
        />
      );
  }
};

export const MetadataSummaryListCompact = ({
  metadata,
  loading,
  entityType,
  schema,
}: MetadataSummaryProps) => {
  const host = getHostMetadataBySchema(metadata?.info, schema);
  const container = getContainerMetadata(metadata?.info);

  switch (entityType) {
    case 'host':
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={host.metadata}
          loading={loading}
          entityType={entityType}
          schema={schema}
        />
      );
    case 'container':
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={container.metadata}
          loading={loading}
          entityType={entityType}
          schema={schema}
        />
      );
    default:
      return (
        <MetadataSummaryListWrapper
          visibleMetadata={[]}
          loading={loading}
          entityType={entityType}
          schema={schema}
        />
      );
  }
};
