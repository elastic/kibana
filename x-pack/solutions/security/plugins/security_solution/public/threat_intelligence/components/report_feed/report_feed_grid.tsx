/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { ThreatReportFeedItem } from './types';
import { ReportFeedCard } from './report_feed_card';
import { ThreatReportFlyout } from './threat_report_flyout';

export const ReportFeedGrid: React.FC<{
  items: ThreatReportFeedItem[];
  highlightReportId?: string;
  emptyMessage?: string;
  onCorrelate?: (reportId: string) => void;
}> = ({ items, highlightReportId, emptyMessage, onCorrelate }) => {
  const { euiTheme } = useEuiTheme();
  const [selectedItem, setSelectedItem] = useState<ThreatReportFeedItem | undefined>();

  const gridCss = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: euiTheme.size.m,
    [`@media (max-width: ${euiTheme.breakpoint.m}px)`]: {
      gridTemplateColumns: '1fr',
    },
  });

  if (items.length === 0) {
    return (
      <EuiPanel hasBorder paddingSize="m" data-test-subj="threatIntelReportFeedEmpty">
        <EuiText size="s" color="subdued">
          {emptyMessage ??
            i18n.translate('xpack.securitySolution.threatIntelligence.reportFeed.gridEmpty', {
              defaultMessage: 'No reports match the current filter set.',
            })}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <>
      <div data-test-subj="threatIntelReportFeedGrid" css={gridCss}>
        {items.map((item) => (
          <ReportFeedCard
            key={item.reportId}
            item={item}
            isHighlighted={highlightReportId === item.reportId}
            onCorrelate={onCorrelate}
            onOpen={setSelectedItem}
          />
        ))}
      </div>
      {selectedItem ? (
        <ThreatReportFlyout item={selectedItem} onClose={() => setSelectedItem(undefined)} />
      ) : null}
    </>
  );
};
