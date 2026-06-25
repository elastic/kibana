/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import type { ArtifactChangeHistoryItem } from './types';
import { ArtifactsVersionHistoryItem } from './artifacts_version_history_item';
import * as i18n from './translations';

const DATE_DISPLAY_FORMAT = 'MMM D YYYY [@] HH:mm';

interface ArtifactsVersionHistoryTimelineProps {
  items: ArtifactChangeHistoryItem[];
  selectedItemId?: string;
  startedAt: Date;
  onSelectItem: (item: ArtifactChangeHistoryItem) => void;
  onViewDetails: (item: ArtifactChangeHistoryItem) => void;
}

export const ArtifactsVersionHistoryTimeline = memo(function ArtifactsVersionHistoryTimeline({
  items,
  selectedItemId,
  startedAt,
  onSelectItem,
  onViewDetails,
}: ArtifactsVersionHistoryTimelineProps): JSX.Element {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      wrapper: css`
        display: flex;
        flex-direction: column;
        height: 100%;
      `,
      list: css`
        flex: 1 1 0;
        overflow-y: auto;
        min-height: 0;
        padding: ${euiTheme.size.s} ${euiTheme.size.m} 0;
      `,
      footer: css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border-top: ${euiTheme.border.thin};
      `,
    }),
    [euiTheme]
  );

  return (
    <div data-test-subj="artifactsVersionHistory" css={styles.wrapper}>
      <div
        css={styles.list}
        aria-label={i18n.TIMELINE_ARIA_LABEL}
        data-test-subj="artifactsVersionHistoryList"
      >
        {items.map((item) => (
          <ArtifactsVersionHistoryItem
            key={item.id}
            item={item}
            selected={selectedItemId === item.id}
            onClick={() => onSelectItem(item)}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
      <div css={styles.footer} data-test-subj="artifactsVersionHistoryTrackingStarted">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="clock" size="s" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.artifacts.versionHistory.trackingStartedOn"
                defaultMessage="On {date} history started"
                values={{
                  date: (
                    <PreferenceFormattedDate value={startedAt} dateFormat={DATE_DISPLAY_FORMAT} />
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
});
