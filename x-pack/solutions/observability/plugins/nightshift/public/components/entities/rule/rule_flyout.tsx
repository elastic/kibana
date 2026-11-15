/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiText, EuiToolTip } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { getEbtProps } from '@kbn/ebt-click';
import type { TimeRange } from '@kbn/es-query';
import { FlyoutTemplate, type FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { buildDiscoverParams } from '../../../common/discover_helpers';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { useFlyoutShareUrlCustomAction } from '../../../common/flyout_share_url_button';
import { useFormatTimestamp } from '../../../common/format_timestamp';
import { buildNightshiftRuleFlyoutShareUrl } from '../../../common/url_params';
import type { DetectionRule } from '../../../data/rules/use_detection_rules';
import { useKibana } from '../../../hooks/use_kibana';
import { SparkPlot } from '../../ui/spark_plot';
import { getRuleStatusPresentation } from './rule_status';

const ACTIONS_LABEL = i18n.translate('xpack.nightshift.ruleFlyout.actions', {
  defaultMessage: 'Actions',
});
const DELETE_LABEL = i18n.translate('xpack.nightshift.ruleFlyout.deleteRule', {
  defaultMessage: 'Delete rule',
});
const DISCOVER_LABEL = i18n.translate('xpack.nightshift.ruleFlyout.openInDiscover', {
  defaultMessage: 'Open in Discover',
});

const HISTORY_KEY = Symbol('nightshiftRuleFlyout');
const DESCRIPTION_TITLE = i18n.translate('xpack.nightshift.ruleFlyout.descriptionTitle', {
  defaultMessage: 'Description',
});
const QUERY_TITLE = i18n.translate('xpack.nightshift.ruleFlyout.queryTitle', {
  defaultMessage: 'Query',
});
const MATCHES_TITLE = i18n.translate('xpack.nightshift.ruleFlyout.matchesTitle', {
  defaultMessage: 'Matches over time',
});
const NO_DESCRIPTION = i18n.translate('xpack.nightshift.ruleFlyout.noDescription', {
  defaultMessage: 'No description',
});
const NO_MATCHES = i18n.translate('xpack.nightshift.ruleFlyout.noMatches', {
  defaultMessage: 'No matches in this time range.',
});

export const RuleFlyout = ({
  rule,
  timeRange,
  getSourceTitle,
  canManage,
  blocksActivity,
  activityBlockTooltip,
  onClose,
  onDeleteRequest,
}: {
  rule: DetectionRule;
  timeRange: TimeRange;
  getSourceTitle: (id: string) => string;
  canManage: boolean;
  blocksActivity: boolean;
  activityBlockTooltip?: string;
  onClose: () => void;
  onDeleteRequest: (rule: DetectionRule) => void;
}) => {
  const { share } = useKibana().services;
  const formatTimestamp = useFormatTimestamp();
  const getShareUrl = useCallback(
    () => buildNightshiftRuleFlyoutShareUrl(rule.query.id),
    [rule.query.id]
  );
  const shareAction = useFlyoutShareUrlCustomAction(getShareUrl);
  const status = getRuleStatusPresentation(rule.status);
  const href = share.url.locators
    .get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR)
    ?.getRedirectUrl(buildDiscoverParams(rule.query.esql.query, timeRange));
  const panels: FlyoutFooterMenuPanel[] = [
    {
      id: 0,
      title: ACTIONS_LABEL,
      items: [
        ...(href
          ? [
              {
                name: DISCOVER_LABEL,
                icon: 'discoverApp' as const,
                href,
                'data-test-subj': 'nightshiftRuleFlyoutDiscoverItem',
                ...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.OPEN_RULE_IN_DISCOVER,
                  element: NIGHTSHIFT_EBT_ELEMENTS.RULE_FLYOUT,
                }),
              },
            ]
          : []),
        ...(canManage
          ? [
              { isSeparator: true as const },
              {
                name: DELETE_LABEL,
                icon: 'trash' as const,
                disabled: blocksActivity,
                toolTipContent: activityBlockTooltip,
                onClick: () => onDeleteRequest(rule),
                'data-test-subj': 'nightshiftRuleFlyoutDeleteItem',
                ...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.DELETE_RULES,
                  element: NIGHTSHIFT_EBT_ELEMENTS.RULE_FLYOUT,
                }),
              },
            ]
          : []),
      ],
    },
  ];
  return (
    <FlyoutTemplate
      onClose={onClose}
      size="s"
      type="push"
      session="start"
      resizable
      historyKey={HISTORY_KEY}
      flyoutMenuProps={{ trailingActions: [shareAction] }}
      data-test-subj="nightshiftRuleFlyout"
    >
      <FlyoutTemplate.Header
        title={rule.query.title}
        description={
          rule.lastActivity
            ? i18n.translate('xpack.nightshift.ruleFlyout.lastActivity', {
                defaultMessage: 'Last activity {time}',
                values: { time: formatTimestamp(new Date(rule.lastActivity).toISOString()) },
              })
            : NO_MATCHES
        }
      >
        {rule.query.severity_score !== undefined ? (
          <FlyoutTemplate.Header.Badge color="hollow">
            <FormattedMessage
              id="xpack.nightshift.ruleFlyout.impactBadgeLabel"
              defaultMessage="{score} impact"
              values={{ score: rule.query.severity_score }}
            />
          </FlyoutTemplate.Header.Badge>
        ) : null}
        {status ? (
          <FlyoutTemplate.Header.Badge color={status.color}>
            {status.tooltip ? (
              <EuiToolTip content={status.tooltip}>
                <span tabIndex={0}>{status.label}</span>
              </EuiToolTip>
            ) : (
              status.label
            )}
          </FlyoutTemplate.Header.Badge>
        ) : null}
        <FlyoutTemplate.Header.Badge color="hollow">
          {getSourceTitle(rule.sourceId)}
        </FlyoutTemplate.Header.Badge>
      </FlyoutTemplate.Header>
      <FlyoutTemplate.Body>
        <FlyoutTemplate.Body.Section title={DESCRIPTION_TITLE}>
          <EuiText size="s">{rule.query.description || NO_DESCRIPTION}</EuiText>
        </FlyoutTemplate.Body.Section>
        <FlyoutTemplate.Body.Section title={QUERY_TITLE}>
          <EuiCodeBlock language="esql" isCopyable>
            {rule.query.esql.query}
          </EuiCodeBlock>
        </FlyoutTemplate.Body.Section>
        <FlyoutTemplate.Body.Section title={MATCHES_TITLE}>
          {rule.matches > 0 ? (
            <SparkPlot
              id={rule.query.id}
              type="bar"
              timeseries={rule.occurrences}
              annotations={[]}
              height={160}
            />
          ) : (
            <EuiText size="s" color="subdued">
              {NO_MATCHES}
            </EuiText>
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
