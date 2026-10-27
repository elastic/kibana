/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate, type FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { Detection } from '@kbn/significant-events-schema';
import React, { useCallback, useMemo } from 'react';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { useFlyoutShareUrlCustomAction } from '../../../common/flyout_share_url_button';
import { useFormatTimestamp } from '../../../common/format_timestamp';
import { buildNightshiftSignalFlyoutShareUrl } from '../../../common/url_params';
import { useDetectionHistory } from '../../../data/detections/use_detection_history';
import { ChangePointLensChart } from './change_point_lens_chart';
import { formatPValue, getChangePointLabel } from '../../../common/change_point';
import { useOpenDetectionInChat } from './use_open_detection_in_chat';

const ACTIONS_LABEL = i18n.translate('xpack.nightshift.detectionDetailsFlyout.actionsLabel', {
  defaultMessage: 'Actions',
});
const OPEN_IN_CHAT_LABEL = i18n.translate(
  'xpack.nightshift.detectionDetailsFlyout.openInChatLabel',
  { defaultMessage: 'Open in chat' }
);
const DETAILS_TITLE = i18n.translate('xpack.nightshift.detectionDetailsFlyout.detailsTitle', {
  defaultMessage: 'Details',
});
const STATISTICAL_SIGNIFICANCE_LABEL = i18n.translate(
  'xpack.nightshift.detectionDetailsFlyout.statisticalSignificanceLabel',
  { defaultMessage: 'Statistical significance' }
);
const SEVERITY_SCORE_LABEL = i18n.translate(
  'xpack.nightshift.detectionDetailsFlyout.severityScoreLabel',
  { defaultMessage: 'Severity score' }
);
const TREND_TITLE = i18n.translate('xpack.nightshift.detectionDetailsFlyout.trendTitle', {
  defaultMessage: 'Trend',
});
const HISTORY_TITLE = i18n.translate('xpack.nightshift.detectionDetailsFlyout.historyTitle', {
  defaultMessage: 'History',
});
const NO_HISTORY = i18n.translate('xpack.nightshift.detectionDetailsFlyout.noHistory', {
  defaultMessage: 'No history available.',
});
const PROCESSED_LABEL = i18n.translate('xpack.nightshift.detectionDetailsFlyout.processedLabel', {
  defaultMessage: 'Processed',
});
const PENDING_LABEL = i18n.translate('xpack.nightshift.detectionDetailsFlyout.pendingLabel', {
  defaultMessage: 'Pending',
});
const HISTORY_KEY = Symbol('nightshiftDetectionDetailsFlyout');

export const DetectionDetailsFlyout = ({
  detection,
  getSourceTitle,
  onClose,
}: {
  detection: Detection;
  getSourceTitle: (sourceId: string) => string;
  onClose: () => void;
}): React.ReactElement => {
  const formatTimestamp = useFormatTimestamp();
  const historyQuery = useDetectionHistory(detection.rule_uuid);
  const openInChat = useOpenDetectionInChat(detection);
  const title = detection.rule_name ?? detection.rule_uuid;
  const getShareUrl = useCallback(
    () => buildNightshiftSignalFlyoutShareUrl(detection.detection_id),
    [detection.detection_id]
  );
  const shareAction = useFlyoutShareUrlCustomAction(getShareUrl);
  const details = useMemo(
    () => [
      ...(detection.p_value !== undefined
        ? [{ title: STATISTICAL_SIGNIFICANCE_LABEL, description: formatPValue(detection.p_value) }]
        : []),
      ...(detection.severity_score !== undefined
        ? [{ title: SEVERITY_SCORE_LABEL, description: detection.severity_score }]
        : []),
    ],
    [detection.p_value, detection.severity_score]
  );
  const history = useMemo(
    () => [...(historyQuery.data?.hits ?? [])].reverse(),
    [historyQuery.data]
  );
  const panels: FlyoutFooterMenuPanel[] = [
    {
      id: 0,
      title: ACTIONS_LABEL,
      items: openInChat
        ? [
            {
              name: OPEN_IN_CHAT_LABEL,
              icon: 'productAgent',
              onClick: openInChat,
              'data-test-subj': 'nightshiftDetectionDetailsFlyoutOpenInChat',
              ...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
                element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_DETAILS_FLYOUT,
              }),
            },
          ]
        : [],
    },
  ];

  return (
    <FlyoutTemplate
      onClose={onClose}
      type="push"
      session="start"
      size="s"
      resizable
      historyKey={HISTORY_KEY}
      flyoutMenuProps={{ trailingActions: [shareAction] }}
      data-test-subj="nightshiftDetectionDetailsFlyout"
    >
      <FlyoutTemplate.Header title={title} description={formatTimestamp(detection['@timestamp'])}>
        <FlyoutTemplate.Header.Badge color="hollow">
          {getChangePointLabel(detection.change_point_type)}
        </FlyoutTemplate.Header.Badge>
        <FlyoutTemplate.Header.Badge color={detection.processed ? 'success' : 'hollow'}>
          {detection.processed ? PROCESSED_LABEL : PENDING_LABEL}
        </FlyoutTemplate.Header.Badge>
        <FlyoutTemplate.Header.Badge color="hollow">
          {getSourceTitle(detection.source_id)}
        </FlyoutTemplate.Header.Badge>
      </FlyoutTemplate.Header>
      <FlyoutTemplate.Body>
        {details.length > 0 ? (
          <FlyoutTemplate.Body.Section title={DETAILS_TITLE}>
            <EuiDescriptionList type="column" compressed listItems={details} />
          </FlyoutTemplate.Body.Section>
        ) : null}
        <FlyoutTemplate.Body.Section title={TREND_TITLE}>
          <ChangePointLensChart detection={detection} />
        </FlyoutTemplate.Body.Section>
        <FlyoutTemplate.Body.Section title={HISTORY_TITLE}>
          {historyQuery.isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : history.length === 0 ? (
            <EuiText size="s" color="subdued">
              {NO_HISTORY}
            </EuiText>
          ) : (
            <EuiTimeline aria-label={HISTORY_TITLE} gutterSize="m">
              {history.map((entry) => {
                const changePointLabel = getChangePointLabel(entry.change_point_type);
                return (
                  <EuiTimelineItem
                    key={entry.detection_id}
                    icon="dot"
                    iconAriaLabel={changePointLabel}
                    verticalAlign="top"
                  >
                    <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{changePointLabel}</EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={entry.processed ? 'success' : 'hollow'}>
                          {entry.processed ? PROCESSED_LABEL : PENDING_LABEL}
                        </EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {formatTimestamp(entry['@timestamp'])}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiTimelineItem>
                );
              })}
            </EuiTimeline>
          )}
        </FlyoutTemplate.Body.Section>
      </FlyoutTemplate.Body>
      {panels[0].items.length > 0 ? (
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryActionMenu
            label={ACTIONS_LABEL}
            aria-label={ACTIONS_LABEL}
            panels={panels}
          />
        </FlyoutTemplate.Footer>
      ) : null}
    </FlyoutTemplate>
  );
};
