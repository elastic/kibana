/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE } from '@kbn/significant-events-plugin/common';
import type {
  LifecycleDetection,
  SignalEntry,
  SignificantEvent,
} from '@kbn/significant-events-schema';
import { formatTimestamp } from '../format_timestamp';
import { getChangePointLabel } from '../change_point';
import { ChangePointTrendChart } from './change_point_visualization';
import { EntityChip } from './entity_chip';
import { EntityFlyout } from './entity_flyout';
import { FlyoutSectionTitle } from './flyout_section_title';
import { TruncatableSummary } from './truncatable_summary';
import { useKibana } from '../../../utils/kibana_react';
import { useFetchStreamFeatures } from '../hooks/use_fetch_stream_features';
import {
  getDetectionEntities,
  enrichEntityFeature,
  resolveEntityFeature,
  type DetectionEntityRef,
} from '../get_detection_entities';
import { formatChatAttachmentDescription } from '../chat_attachment_description';

export interface DetectionFlyoutProps {
  detection: LifecycleDetection;
  event: SignificantEvent;
  signal?: SignalEntry;
  onClose: () => void;
}

export function DetectionFlyout({
  detection,
  event,
  signal,
  onClose,
}: DetectionFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { share, agentBuilder } = useKibana().services;
  const [selectedEntity, setSelectedEntity] = useState<DetectionEntityRef | undefined>();

  const {
    data: streamFeatures = [],
    isLoading: isLoadingStreamFeatures,
    isError: isStreamFeaturesError,
    refetch: refetchStreamFeatures,
  } = useFetchStreamFeatures(detection.stream_name);
  const associatedEntities = useMemo(
    () => getDetectionEntities(event, detection, streamFeatures),
    [detection, event, streamFeatures]
  );
  const selectedEntityFeature = useMemo(() => {
    if (!selectedEntity) {
      return undefined;
    }
    return enrichEntityFeature(selectedEntity, resolveEntityFeature(selectedEntity), signal);
  }, [selectedEntity, signal]);

  useEffect(() => {
    if (selectedEntity && !associatedEntities.some((entity) => entity.key === selectedEntity.key)) {
      setSelectedEntity(undefined);
    }
  }, [associatedEntities, selectedEntity]);

  const closeEntityFlyout = () => {
    setSelectedEntity(undefined);
  };

  const title = detection.rule_name;
  const changePointLabel = getChangePointLabel(detection.change_point_type);
  const summary = signal?.description;
  const esqlQuery = signal?.evidence?.esql_query;

  const discoverHref = useMemo(() => {
    if (!esqlQuery) {
      return undefined;
    }
    return share.url.locators
      .get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR)
      ?.getRedirectUrl({ query: { esql: esqlQuery } });
  }, [share, esqlQuery]);

  const handleOpenInChat = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      autoSendInitialMessage: true,
      initialMessage: i18n.translate('xpack.observability.nightshift.detectionFlyout.chatPrompt', {
        defaultMessage: 'Tell me about the {ruleName} detection',
        values: { ruleName: title },
      }),
      attachments: [
        {
          id: detection.detection_id,
          type: SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
          origin: detection.detection_id,
          description: formatChatAttachmentDescription('Detection', title),
          data: detection,
        },
      ],
    });
  }, [agentBuilder, detection, title]);

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="s"
        session="inherit"
        aria-label={title}
        data-test-subj="nightshiftDetectionFlyout"
        type="push"
        hasAnimation={false}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color="default">
                {i18n.translate('xpack.observability.nightshift.detectionFlyout.detectionBadge', {
                  defaultMessage: 'Detection',
                })}
              </EuiBadge>
            </EuiFlexItem>
            {detection.change_point_type && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="default">{changePointLabel}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {formatTimestamp(detection['@timestamp'])}
          </EuiText>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {summary && (
            <>
              <FlyoutSectionTitle>
                {i18n.translate('xpack.observability.nightshift.detectionFlyout.summaryTitle', {
                  defaultMessage: 'Summary',
                })}
              </FlyoutSectionTitle>
              <EuiSpacer size="s" />
              <TruncatableSummary
                summary={summary}
                testSubj="nightshiftDetectionFlyoutSummary"
                toggleTestSubj="nightshiftDetectionFlyoutSummaryToggle"
              />
              <EuiSpacer size="l" />
            </>
          )}

          {(isLoadingStreamFeatures || isStreamFeaturesError || associatedEntities.length > 0) && (
            <>
              <FlyoutSectionTitle>
                {i18n.translate('xpack.observability.nightshift.detectionFlyout.entitiesTitle', {
                  defaultMessage: 'Associated entities',
                })}
              </FlyoutSectionTitle>
              <EuiSpacer size="s" />
              {isLoadingStreamFeatures && (
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
              {isStreamFeaturesError && (
                <EuiCallOut
                  announceOnMount
                  color="warning"
                  iconType="warning"
                  size="s"
                  title={i18n.translate(
                    'xpack.observability.nightshift.detectionFlyout.entitiesErrorTitle',
                    { defaultMessage: 'Unable to load associated entities' }
                  )}
                >
                  <EuiButtonEmpty
                    color="warning"
                    data-test-subj="nightshiftDetectionFlyoutEntitiesRetryButton"
                    flush="left"
                    iconType="refresh"
                    onClick={() => refetchStreamFeatures()}
                    size="s"
                  >
                    {i18n.translate(
                      'xpack.observability.nightshift.detectionFlyout.entitiesRetryButtonText',
                      { defaultMessage: 'Retry' }
                    )}
                  </EuiButtonEmpty>
                </EuiCallOut>
              )}
              {!isLoadingStreamFeatures &&
                !isStreamFeaturesError &&
                associatedEntities.length > 0 && (
                  <EuiFlexGroup gutterSize="s" wrap responsive={false}>
                    {associatedEntities.map((entity) => (
                      <EuiFlexItem grow={false} key={entity.key}>
                        <EntityChip
                          label={entity.label}
                          onClick={() => setSelectedEntity(entity)}
                          testSubj="nightshiftDetectionFlyoutEntityChip"
                        />
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                )}
              <EuiSpacer size="l" />
            </>
          )}

          <FlyoutSectionTitle>
            {i18n.translate('xpack.observability.nightshift.detectionFlyout.trendTitle', {
              defaultMessage: 'Trend',
            })}
          </FlyoutSectionTitle>
          <EuiSpacer size="s" />
          <ChangePointTrendChart
            changePointType={detection.change_point_type}
            streamName={detection.stream_name}
            endTime={detection['@timestamp']}
          />

          {esqlQuery && (
            <>
              <EuiSpacer size="l" />
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                responsive={false}
                gutterSize="s"
              >
                <EuiFlexItem grow={false}>
                  <FlyoutSectionTitle>
                    {i18n.translate('xpack.observability.nightshift.detectionFlyout.esqlTitle', {
                      defaultMessage: 'ES|QL query',
                    })}
                  </FlyoutSectionTitle>
                </EuiFlexItem>
                {discoverHref && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      href={discoverHref}
                      size="xs"
                      iconType="discoverApp"
                      data-test-subj="nightshiftDetectionFlyoutDiscoverLink"
                    >
                      {i18n.translate(
                        'xpack.observability.nightshift.detectionFlyout.openInDiscoverLinkText',
                        { defaultMessage: 'Open in Discover' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiCodeBlock
                language="sql"
                fontSize="s"
                paddingSize="m"
                isCopyable
                overflowHeight={220}
                data-test-subj="nightshiftDetectionFlyoutEsql"
              >
                {esqlQuery}
              </EuiCodeBlock>
            </>
          )}
        </EuiFlyoutBody>

        {agentBuilder && (
          <EuiFlyoutFooter
            css={css`
              background: ${euiTheme.colors.backgroundBasePlain};
              border-top: ${euiTheme.border.thin};
            `}
          >
            <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <AiButton
                  variant="empty"
                  size="s"
                  iconType="productAgent"
                  iconSide="left"
                  data-test-subj="nightshiftDetectionFlyoutChatButton"
                  onClick={handleOpenInChat}
                >
                  {i18n.translate(
                    'xpack.observability.nightshift.detectionFlyout.openInChatButtonLabel',
                    {
                      defaultMessage: 'Open in chat',
                    }
                  )}
                </AiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        )}
      </EuiFlyout>

      {selectedEntityFeature && (
        <EntityFlyout
          key={selectedEntityFeature.uuid}
          feature={selectedEntityFeature}
          enableChatAttachment={Boolean(selectedEntity?.feature)}
          onClose={closeEntityFlyout}
        />
      )}
    </>
  );
}
