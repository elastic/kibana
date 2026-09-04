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
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE } from '@kbn/significant-events-plugin/common';
import type {
  LifecycleDetection,
  SignalEntry,
  SignificantEvent,
} from '@kbn/significant-events-schema';
import { useFormatTimestamp } from '../common/format_timestamp';
import { getChangePointLabel } from './change_point';
import { getVerdictBadge } from './verdict';
import { ChangePointLensChart } from './change_point_lens_chart';
import { EntityChip } from '../entity/entity_chip';
import { EntityFlyout } from '../entity/entity_flyout';
import { FlyoutSectionTitle } from '../common/flyout_section_title';
import { TruncatableSummary } from '../common/truncatable_summary';
import { useKibana } from '../hooks/use_kibana';
import { useImpactedServices } from '../hooks/use_impacted_services';
import type { ResolvedImpactedService } from '../common/impacted_services';
import { formatChatAttachmentDescription } from '../chat/chat_attachment_description';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../common/ebt_constants';

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
  const formatTimestamp = useFormatTimestamp();
  const { share, agentBuilder } = useKibana().services;
  const [selectedEntity, setSelectedEntity] = useState<ResolvedImpactedService | undefined>();

  const { services: associatedEntities, isInitialLoading: isLoadingStreamFeatures } =
    useImpactedServices(event);
  const selectedEntityFeature = selectedEntity?.feature;

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
  const verdictBadge = getVerdictBadge(signal?.verdict);
  const summary = signal?.description;
  const esqlQuery = signal?.evidence?.esql_query;

  const discoverHref = useMemo(() => {
    if (!esqlQuery) {
      return undefined;
    }
    const detectionTime = moment(detection['@timestamp']);
    if (!detectionTime.isValid()) {
      return undefined;
    }
    return share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
      query: { esql: esqlQuery },
      timeRange: {
        from: detectionTime.clone().subtract(1, 'hour').toISOString(),
        to: detectionTime.clone().add(15, 'minutes').toISOString(),
      },
    });
  }, [detection, esqlQuery, share]);

  const handleOpenInChat = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      autoSendInitialMessage: false,
      initialMessage: i18n.translate('xpack.nightshift.detectionFlyout.chatPrompt', {
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
        resizable
        aria-label={title}
        data-test-subj="nightshiftDetectionFlyout"
        type="push"
        hasAnimation={false}
        closeButtonProps={{
          'data-test-subj': 'euiFlyoutCloseButton',
          ...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.CLOSE_FLYOUT,
            element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_FLYOUT,
          }),
        }}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color="default">
                {i18n.translate('xpack.nightshift.detectionFlyout.detectionBadge', {
                  defaultMessage: 'Detection',
                })}
              </EuiBadge>
            </EuiFlexItem>
            {detection.change_point_type && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="default">{changePointLabel}</EuiBadge>
              </EuiFlexItem>
            )}
            {verdictBadge && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={verdictBadge.color}>{verdictBadge.label}</EuiBadge>
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
                {i18n.translate('xpack.nightshift.detectionFlyout.summaryTitle', {
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

          {(isLoadingStreamFeatures || associatedEntities.length > 0) && (
            <>
              <FlyoutSectionTitle>
                {i18n.translate('xpack.nightshift.detectionFlyout.entitiesTitle', {
                  defaultMessage: 'Impacted services',
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
              {!isLoadingStreamFeatures && associatedEntities.length > 0 && (
                <EuiFlexGroup gutterSize="s" wrap responsive={false}>
                  {associatedEntities.map((entity) => (
                    <EuiFlexItem grow={false} key={entity.key}>
                      <EntityChip
                        ebt={{
                          action: NIGHTSHIFT_EBT_ACTIONS.VIEW_ENTITY,
                          element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_FLYOUT_ENTITIES,
                        }}
                        label={entity.name}
                        onClick={() => setSelectedEntity(entity)}
                        testSubj="nightshiftDetectionFlyoutEntityChip"
                        size="compact"
                      />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              )}
              <EuiSpacer size="l" />
            </>
          )}

          <FlyoutSectionTitle>
            {i18n.translate('xpack.nightshift.detectionFlyout.trendTitle', {
              defaultMessage: 'Trend',
            })}
          </FlyoutSectionTitle>
          <EuiSpacer size="s" />
          <ChangePointLensChart detection={detection} />

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
                    {i18n.translate('xpack.nightshift.detectionFlyout.esqlTitle', {
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
                      {...getEbtProps({
                        action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER,
                        element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_FLYOUT,
                      })}
                    >
                      {i18n.translate('xpack.nightshift.detectionFlyout.openInDiscoverLinkText', {
                        defaultMessage: 'Open in Discover',
                      })}
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
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
                    element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_FLYOUT,
                    detail: NIGHTSHIFT_EBT_DETAILS.NEW_CONVERSATION,
                  })}
                >
                  {i18n.translate('xpack.nightshift.detectionFlyout.openInChatButtonLabel', {
                    defaultMessage: 'Open in chat',
                  })}
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
          onClose={closeEntityFlyout}
        />
      )}
    </>
  );
}
