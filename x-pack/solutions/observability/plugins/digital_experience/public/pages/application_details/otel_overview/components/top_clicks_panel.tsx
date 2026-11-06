/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TopClick } from '../../../../../common/types/usage';
import { BarList } from '../../../../components/bar_list';
import { DataPanel } from '../../../../components/data_panel';

const TITLE = i18n.translate('xpack.digitalExperience.overview.topClicks.title', {
  defaultMessage: 'Top clicked elements',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.overview.topClicks.subtitle', {
  defaultMessage: 'The elements clicked the most, by CSS selector, with their share of the clicks.',
});

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.overview.topClicks.empty', {
  defaultMessage: 'No clicks in this time range.',
});

/** The elements users clicked the most, by CSS selector. */
export function TopClicksPanel({
  clicks,
  totalClicks,
  isLoading,
}: {
  clicks: TopClick[];
  totalClicks: number;
  isLoading: boolean;
}) {
  const items = clicks.map(({ cssSelector, tagName, count }) => {
    return {
      key: cssSelector,
      value: count,
      label: (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {tagName && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{tagName}</EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem className="eui-textTruncate">
            <EuiCode transparentBackground>{cssSelector}</EuiCode>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  });

  return (
    <DataPanel
      title={TITLE}
      subtitle={SUBTITLE}
      isLoading={isLoading}
      isEmpty={clicks.length === 0}
      emptyMessage={EMPTY_MESSAGE}
      showInstrumentationDocs
      data-test-subj="digitalExperienceOverviewTopClicks"
    >
      <BarList items={items} total={totalClicks} aria-label={TITLE} />
    </DataPanel>
  );
}
