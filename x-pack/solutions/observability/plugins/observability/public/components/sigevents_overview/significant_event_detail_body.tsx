/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InfoPanel } from './info_panel';
import { MetadataIconCard } from './metadata_icon_card';
import { StreamsMetricTiles } from './streams_metric_tiles';
import { RemediationPlanPanel } from './remediation_plan_panel';
import type { StreamMetricConfig, RemediationStep } from '.';

export interface SignificantEventDetailFields {
  id: string;
  label: string;
  subtitle: string;
  severityLabel: string;
  severityColor: EuiBadgeProps['color'];
}

export interface SignificantEventDetailBodyProps {
  event: SignificantEventDetailFields;
  relevanceScore?: number;
  suggestionsCount?: number;
  metrics?: StreamMetricConfig[];
  remediationSteps?: RemediationStep[];
  onRemediate?: () => void;
  onRunInBackground?: () => void;
  onOpenConversation?: () => void;
}

export const SignificantEventDetailBody: React.FC<SignificantEventDetailBodyProps> = ({
  event,
  relevanceScore = 75,
  suggestionsCount = 2,
  metrics,
  remediationSteps,
  onRemediate,
  onRunInBackground,
  onOpenConversation,
}) => {
  const summaryPanelTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childSummaryTitle',
    { defaultMessage: 'Summary' }
  );

  const generalInfoTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childGeneralInfoTitle',
    { defaultMessage: 'General information' }
  );

  const summaryBody = useMemo(
    () =>
      i18n.translate('xpack.observability.sigeventsOverview.sigEvents.childSummaryBody', {
        defaultMessage:
          'This signal was raised on {stream}. {title} reflects a statistically significant deviation from the expected pattern for the selected window—review downstream dependencies and blast radius before changes propagate.',
        values: { stream: event.subtitle, title: event.label },
      }),
    [event.label, event.subtitle]
  );

  const metaSeverityTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childMetaSeverity',
    { defaultMessage: 'Severity' }
  );

  const metaStreamTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childMetaStream',
    { defaultMessage: 'Relevance' }
  );

  const metaWindowTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childMetaWindow',
    { defaultMessage: 'Suggestions' }
  );

  const severityHealthColor = useMemo(() => {
    if (event.severityColor === 'danger') return 'danger' as const;
    if (event.severityColor === 'warning') return 'warning' as const;
    return 'subdued' as const;
  }, [event.severityColor]);

  const generalInfoDescriptionItems = useMemo(() => {
    return [
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermStream',
          { defaultMessage: 'Stream' }
        ),
        description: event.subtitle,
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermSeverity',
          { defaultMessage: 'Severity' }
        ),
        description: event.severityLabel,
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermBaseline',
          { defaultMessage: 'Baseline' }
        ),
        description: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralDescBaseline',
          {
            defaultMessage:
              '7-day rolling average with hour-of-day cohort; minimum density enforced for sparse streams.',
          }
        ),
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermDetection',
          { defaultMessage: 'Detection' }
        ),
        description: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralDescDetection',
          {
            defaultMessage:
              'Flags statistically significant deviation from the learned pattern for the selected window.',
          }
        ),
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermGuidance',
          { defaultMessage: 'Guidance' }
        ),
        description: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralDescGuidance',
          {
            defaultMessage:
              'Confirm blast radius and downstream dependencies before remediation; attach context from related services.',
          }
        ),
      },
    ];
  }, [event.severityLabel, event.subtitle]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      data-test-subj="sigeventsOverviewSignificantEventDetailBody"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={true} wrap>
          <EuiFlexItem grow={true}>
            <MetadataIconCard
              hideIcon
              title={metaSeverityTitle}
              value={<EuiHealth color={severityHealthColor}>{event.severityLabel}</EuiHealth>}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <MetadataIconCard
              hideIcon
              title={metaStreamTitle}
              value={<EuiBadge color="accent">{relevanceScore}</EuiBadge>}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <MetadataIconCard hideIcon title={metaWindowTitle} value={String(suggestionsCount)} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <InfoPanel title={summaryPanelTitle}>
          <EuiText size="s">
            <p>{summaryBody}</p>
          </EuiText>
        </InfoPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <StreamsMetricTiles metrics={metrics} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <InfoPanel title={generalInfoTitle}>
          {generalInfoDescriptionItems.map((listItem, index) => (
            <React.Fragment key={listItem.title}>
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 2]}
                compressed
                listItems={[listItem]}
              />
              {index < generalInfoDescriptionItems.length - 1 ? (
                <EuiHorizontalRule margin="m" />
              ) : null}
            </React.Fragment>
          ))}
        </InfoPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <RemediationPlanPanel
          steps={remediationSteps}
          onRemediate={onRemediate}
          onRunInBackground={onRunInBackground}
          onOpenConversation={onOpenConversation}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
