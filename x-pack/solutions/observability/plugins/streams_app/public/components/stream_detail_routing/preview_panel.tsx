/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { WiredStreamGetResponse } from '@kbn/streams-schema';
import { css } from '@emotion/css';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useAsyncSample } from '../../hooks/queries/use_async_sample';
import { PreviewTable } from '../preview_table';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { useRoutingState } from './hooks/routing_state';
import { PreviewPanelIllustration } from './preview_panel_illustration';
import { PreviewMatches } from './preview_matches';

export function PreviewPanel({
  definition,
  routingAppState,
}: {
  definition: WiredStreamGetResponse;
  routingAppState: ReturnType<typeof useRoutingState>;
}) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const {
    timeRange,
    absoluteTimeRange: { start, end },
    setTimeRange,
  } = useDateRange({ data });

  const {
    isLoadingDocuments,
    documents,
    documentsError,
    refresh,
    approximateMatchingPercentage,
    isLoadingDocumentCounts,
    documentCountsError,
  } = useAsyncSample({
    condition: routingAppState.debouncedChildUnderEdit?.isNew
      ? routingAppState.debouncedChildUnderEdit.child.if
      : undefined,
    start: start?.valueOf(),
    end: end?.valueOf(),
    size: 100,
    streamDefinition: definition,
  });

  let content;

  if (!routingAppState.debouncedChildUnderEdit) {
    content = (
      <PreviewPanelIllustration>
        <>
          <EuiText size="m" textAlign="center">
            {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageEmpty', {
              defaultMessage: 'Your preview will appear here',
            })}
          </EuiText>
          <EuiText size="xs" textAlign="center">
            {i18n.translate(
              'xpack.streams.streamDetail.preview.editPreviewMessageEmptyDescription',
              {
                defaultMessage:
                  'Create a new child stream to see what will be routed to it based on the conditions',
              }
            )}
          </EuiText>
        </>
        ;
      </PreviewPanelIllustration>
    );
  }

  if (routingAppState.debouncedChildUnderEdit && !routingAppState.debouncedChildUnderEdit.isNew) {
    content = (
      <PreviewPanelIllustration>
        <EuiText size="m" textAlign="center">
          {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessage', {
            defaultMessage: 'Preview is not available while editing streams',
          })}
        </EuiText>
      </PreviewPanelIllustration>
    );
  }

  if (
    routingAppState.debouncedChildUnderEdit &&
    routingAppState.debouncedChildUnderEdit.isNew &&
    isLoadingDocuments
  ) {
    content = (
      <PreviewPanelIllustration>
        <EuiText size="xs" textAlign="center">
          <EuiLoadingSpinner size="s" />
        </EuiText>
      </PreviewPanelIllustration>
    );
  }

  if (
    routingAppState.debouncedChildUnderEdit &&
    routingAppState.debouncedChildUnderEdit.isNew &&
    documents.length === 0
  ) {
    content = (
      <PreviewPanelIllustration>
        <EuiText size="xs" textAlign="center">
          {i18n.translate('xpack.streams.streamDetail.preview.empty', {
            defaultMessage: 'No documents to preview',
          })}
        </EuiText>
      </PreviewPanelIllustration>
    );
  }

  if (
    routingAppState.debouncedChildUnderEdit &&
    routingAppState.debouncedChildUnderEdit.isNew &&
    documentsError
  ) {
    content = (
      <PreviewPanelIllustration>
        <EuiFlexItem grow>
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiText color="danger">
              {i18n.translate('xpack.streams.streamDetail.preview.error', {
                defaultMessage: 'Error loading preview',
              })}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
      </PreviewPanelIllustration>
    );
  }

  if (
    routingAppState.debouncedChildUnderEdit &&
    routingAppState.debouncedChildUnderEdit.isNew &&
    documents.length > 0
  ) {
    content = (
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <PreviewMatches
              approximateMatchingPercentage={approximateMatchingPercentage}
              error={documentCountsError}
              isLoading={isLoadingDocumentCounts}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <PreviewTable documents={documents ?? []} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow>
            <EuiText
              size="s"
              className={css`
                font-weight: bold;
              `}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiIcon type="inspect" />
                {i18n.translate('xpack.streams.streamDetail.preview.header', {
                  defaultMessage: 'Data Preview',
                })}
                {isLoadingDocuments && <EuiLoadingSpinner size="s" />}
              </EuiFlexGroup>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar
              onQuerySubmit={({ dateRange }, isUpdate) => {
                if (!isUpdate) {
                  refresh();
                  return;
                }

                if (dateRange) {
                  setTimeRange({
                    from: dateRange.from,
                    to: dateRange?.to,
                    mode: dateRange.mode,
                  });
                }
              }}
              onRefresh={() => {
                refresh();
              }}
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem grow>{content}</EuiFlexItem>
    </>
  );
}
