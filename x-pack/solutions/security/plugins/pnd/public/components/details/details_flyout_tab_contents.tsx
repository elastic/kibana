/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiBasicTable,
  EuiText,
  EuiTitle,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { DetailsBlock } from './detail_block';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { TimelineEventList } from '../timeline';

export type FlyoutTab = 'overview' | 'attachments' | 'timeline';

const getColumns = () => {
  const cellContent = (value: string) => (
    <EuiText size="xs" color="subdued">
      {value}
    </EuiText>
  );

  return [
    {
      field: 'field',
      name: DETAILS_FLYOUT_LABELS.overview.fieldColumn,
      render: (field: string) => cellContent(field),
    },
    {
      field: 'value',
      name: DETAILS_FLYOUT_LABELS.overview.valueColumn,
      render: (value: string) => cellContent(value),
    },
  ];
};

const SUMMARY_LIMIT = 120;

export const OverviewTab = memo<{ investigation: Investigation }>(({ investigation }) => {
  const { euiTheme } = useEuiTheme();
  const { summary, title, affectedSurface, severity } = investigation;
  const [expanded, setExpanded] = useState(false);

  const isCondensed = summary != null && summary.length > SUMMARY_LIMIT;
  const displayedSummary =
    isCondensed && !expanded ? `${summary.slice(0, SUMMARY_LIMIT)}...` : summary;

  interface ImpactRow {
    field: string;
    value: string;
  }
  const impactRows: ImpactRow[] = [
    affectedSurface
      ? { field: DETAILS_FLYOUT_LABELS.overview.compromised, value: affectedSurface }
      : null,
    severity ? { field: DETAILS_FLYOUT_LABELS.overview.severity, value: severity } : null,
  ].filter((row): row is ImpactRow => row !== null);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {summary && (
        <EuiFlexItem>
          <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.overview}>
            <EuiText size="s" color="subdued">
              <p>{displayedSummary}</p>
            </EuiText>
            {isCondensed && (
              <div>
                <EuiButtonEmpty size="s" flush="left" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded
                    ? DETAILS_FLYOUT_LABELS.overview.showLess
                    : DETAILS_FLYOUT_LABELS.overview.showMore}
                </EuiButtonEmpty>
              </div>
            )}
          </DetailsBlock>
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="m" style={{ borderRadius: euiTheme.size.s }}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: euiTheme.size.s,
                  width: euiTheme.size.xl,
                  height: euiTheme.size.xl,
                  justifyContent: 'center',
                  background: euiTheme.colors.backgroundLightDanger,
                }}
              >
                <EuiIcon
                  type="warning"
                  size="m"
                  aria-hidden="true"
                  color={euiTheme.colors.danger}
                />
              </span>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <EuiTextTruncate text={title} />
              </EuiText>
              <EuiText size="xs" color="subdued">
                <span>{DETAILS_FLYOUT_LABELS.overview.triggerAlert}</span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      {impactRows.length > 0 && (
        <EuiFlexItem>
          <DetailsBlock title={DETAILS_FLYOUT_LABELS.sections.impact}>
            <EuiPanel hasBorder paddingSize="none" style={{ borderRadius: euiTheme.size.s }}>
              <EuiBasicTable
                tableCaption={DETAILS_FLYOUT_LABELS.overview.tableCaption}
                rowHeader="field"
                items={impactRows}
                columns={getColumns()}
                tableLayout="auto"
              />
            </EuiPanel>
          </DetailsBlock>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
OverviewTab.displayName = 'OverviewTab';

export const AttachmentsTab = memo(() => (
  <EuiEmptyPrompt
    iconType="paperClip"
    title={<h3>{DETAILS_FLYOUT_LABELS.attachments.emptyTitle}</h3>}
    body={
      <EuiText size="s" color="subdued">
        <p>{DETAILS_FLYOUT_LABELS.attachments.emptyBody}</p>
      </EuiText>
    }
  />
));
AttachmentsTab.displayName = 'AttachmentsTab';

export const TimelineTab = memo<{ events: Investigation['events'] }>(({ events }) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    <EuiFlexItem>
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{DETAILS_FLYOUT_LABELS.sections.timeline}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <span>{events.length}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem>
      <TimelineEventList events={events} />
    </EuiFlexItem>
  </EuiFlexGroup>
));
TimelineTab.displayName = 'TimelineTab';
