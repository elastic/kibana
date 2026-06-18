/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse, IEsSearchRequest } from '@kbn/search-types';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { RulePreviewAlertsTable } from '../../../detection_engine/rule_creation_ui/components/rule_preview/rule_preview_alerts_table';
import type {
  RulePreviewAttachment,
  PreviewMetadataState,
  RulePreviewAttachmentServices,
} from './types';
import {
  buildRulePreviewMetadataSearchRequest,
  getRulePreviewAttachmentDataTableId,
  getRulePreviewMetadata,
} from './utils';
import type { RulePreviewMetadataResponse } from './utils';
import { RulePreviewAttachmentErrorCallout } from './error_callout';
import {
  RulePreviewAttachmentDataViewBootstrap,
  RulePreviewAttachmentSecurityProviders,
} from './providers';

export const RulePreviewInlineContent: React.FC<
  AttachmentRenderProps<RulePreviewAttachment> & RulePreviewAttachmentServices
> = ({ attachment, data, spaces, getServices, getStore }) => {
  const [spaceId, setSpaceId] = useState<string>();
  const [metadata, setMetadata] = useState<PreviewMetadataState>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;
    spaces
      .getActiveSpace()
      .then((space) => {
        if (isMounted) {
          setSpaceId(space.id);
        }
      })
      .catch((spaceError) => {
        if (isMounted) {
          setError(spaceError instanceof Error ? spaceError : new Error(String(spaceError)));
        }
      });
    return () => {
      isMounted = false;
    };
  }, [spaces]);

  useEffect(() => {
    let isMounted = true;
    if (!spaceId) {
      return;
    }

    const loadMetadata = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await lastValueFrom(
          data.search.search<IEsSearchRequest, IKibanaSearchResponse<RulePreviewMetadataResponse>>(
            buildRulePreviewMetadataSearchRequest({
              previewId: attachment.data.previewId,
              spaceId,
            })
          )
        );

        if (isMounted) {
          setMetadata(getRulePreviewMetadata(response.rawResponse));
        }
      } catch (metadataError) {
        if (isMounted) {
          setError(
            metadataError instanceof Error ? metadataError : new Error(String(metadataError))
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, [attachment.data.previewId, data.search, spaceId]);

  if (error) {
    return <RulePreviewAttachmentErrorCallout />;
  }

  if (isLoading || !spaceId) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiLoadingSpinner />
      </EuiPanel>
    );
  }

  if (!metadata) {
    return (
      <EuiCallOut
        announceOnMount={false}
        color="warning"
        iconType="warning"
        size="s"
        title={i18n.translate(
          'xpack.securitySolution.agentBuilder.rulePreviewAttachment.emptyTitle',
          { defaultMessage: 'No rule preview alerts found' }
        )}
      />
    );
  }

  return (
    <RulePreviewAttachmentSecurityProviders getServices={getServices} getStore={getStore}>
      <RulePreviewAttachmentDataViewBootstrap />
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <RulePreviewAlertsTable
          previewId={attachment.data.previewId}
          spaceId={spaceId}
          indexPattern={undefined}
          timeframeOptions={{
            timeframeStart: metadata.timeframeStart,
            timeframeEnd: metadata.timeframeEnd,
            interval: '5m',
            lookback: '1m',
          }}
          dataTableId={getRulePreviewAttachmentDataTableId(attachment.data.previewId)}
        />
      </EuiPanel>
    </RulePreviewAttachmentSecurityProviders>
  );
};
