/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { SeverityLevel, ThreatCategory } from '../../../../common/threat_intelligence/hub';
import { getThreatCategoryLabel } from '../../../../common/threat_intelligence/hub';
import type { ReportFeedSort } from './constants';

export const ReportFeedFilterRow: React.FC<{
  severityCounts: Record<SeverityLevel, number>;
  categoryCounts: Map<ThreatCategory, number>;
  selectedSeverities: SeverityLevel[];
  selectedCategories: ThreatCategory[];
  onToggleSeverity: (severity: SeverityLevel) => void;
  onToggleCategory: (category: ThreatCategory) => void;
  onClear: () => void;
  sortBy: ReportFeedSort;
  onSortChange: (next: ReportFeedSort) => void;
  totalShown: number;
  totalAvailable: number;
}> = ({ categoryCounts, selectedCategories, onToggleCategory, onClear }) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'threatIntelReportFeedFilter' });

  const visibleCategories = useMemo(
    () =>
      Array.from(categoryCounts.entries())
        .filter(([, count]) => count > 0)
        .slice(0, 8),
    [categoryCounts]
  );

  const activeFilterCount = selectedCategories.length;
  const hasAnyFilter = activeFilterCount > 0;
  const optionCount = visibleCategories.length;

  const filterButtonLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.reportFeed.filterButton',
    { defaultMessage: 'Filter' }
  );

  const popoverPanelCss = css({
    minWidth: 220,
    maxWidth: 280,
  });

  const optionRowCss = css({
    padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
    borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    display: 'flex',
    alignItems: 'center',
  });

  return (
    <EuiPopover
      id={popoverId}
      button={
        <EuiFilterGroup>
          <EuiFilterButton
            data-test-subj="threatIntelReportFeedFilterButton"
            iconType="arrowDown"
            onClick={() => setIsPopoverOpen((open) => !open)}
            isSelected={isPopoverOpen}
            hasActiveFilters={hasAnyFilter}
            numActiveFilters={hasAnyFilter ? activeFilterCount : optionCount}
            numFilters={optionCount}
          >
            {filterButtonLabel}
          </EuiFilterButton>
        </EuiFilterGroup>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <div css={popoverPanelCss} data-test-subj="threatIntelReportFeedFilterRow">
        <EuiPopoverTitle paddingSize="s">
          <EuiText size="xs" color="subdued" textAlign="center">
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.reportFeed.filterOptionsCount',
              {
                defaultMessage: '{count} {count, plural, one {option} other {options}}',
                values: { count: optionCount },
              }
            )}
          </EuiText>
        </EuiPopoverTitle>
        {visibleCategories.map(([category]) => {
          const isSelected = selectedCategories.includes(category);
          return (
            <div key={`category-chip-${category}`} css={optionRowCss}>
              <EuiBadge
                color={isSelected ? 'primary' : 'hollow'}
                onClick={() => onToggleCategory(category)}
                onClickAriaLabel={i18n.translate(
                  'xpack.securitySolution.threatIntelligence.reportFeed.categoryChipAria',
                  {
                    defaultMessage: 'Toggle {category} category filter',
                    values: { category },
                  }
                )}
                data-test-subj={`threatIntelCategoryChip-${category}`}
              >
                {getThreatCategoryLabel(category)}
              </EuiBadge>
            </div>
          );
        })}
        <div css={css({ padding: euiTheme.size.s })}>
          <EuiButtonEmpty
            size="xs"
            iconType="cross"
            flush="left"
            onClick={() => {
              onClear();
              setIsPopoverOpen(false);
            }}
            disabled={!hasAnyFilter}
            data-test-subj="threatIntelReportFeedFilterClearAll"
          >
            {i18n.translate('xpack.securitySolution.threatIntelligence.reportFeed.filterClearAll', {
              defaultMessage: 'Clear all',
            })}
          </EuiButtonEmpty>
        </div>
      </div>
    </EuiPopover>
  );
};
