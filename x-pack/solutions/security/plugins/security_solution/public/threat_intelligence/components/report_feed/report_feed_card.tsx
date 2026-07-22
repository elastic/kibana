/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { getThreatCategoryLabel } from '../../../../common/threat_intelligence/hub';
import { useKibana } from '../../../common/lib/kibana';
import { navigateToCorrelateReport } from '../../lib/navigate_to_correlation_reports';
import type { ThreatReportFeedItem } from './types';
import { getSeverityColor, getSeverityLabel } from './severity_labels';
import { ThreatCategoryBadge } from './threat_category_badge';
import { getSourceFaviconUrl } from './utils';

const metaDividerCss = css({
  opacity: 0.5,
  margin: '0 4px',
});

export const ReportFeedCard: React.FC<{
  item: ThreatReportFeedItem;
  isHighlighted?: boolean;
  onCorrelate?: (reportId: string) => void;
  onOpen?: (item: ThreatReportFeedItem) => void;
}> = ({ item, isHighlighted = false, onCorrelate, onOpen }) => {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const cardRef = useRef<HTMLDivElement>(null);
  const faviconUrl = getSourceFaviconUrl(item.sourceUrl);
  const displayTitle = item.title || item.reportId;
  const publishedDate = item.publishedAt ? new Date(item.publishedAt) : undefined;
  const severityColor = getSeverityColor(item.severity);
  const primaryCategoryLabel =
    item.categories.length > 0 ? getThreatCategoryLabel(item.categories[0]) : undefined;
  const envHits = item.environmentHitsTotal ?? 0;

  const handleCorrelate = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (onCorrelate) {
        onCorrelate(item.reportId);
        return;
      }
      void navigateToCorrelateReport(application, item.reportId);
    },
    [application, item.reportId, onCorrelate]
  );

  const handleOpen = useCallback(() => {
    onOpen?.(item);
  }, [item, onOpen]);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const panelCss = css({
    borderLeft: `4px solid ${severityColor}`,
    height: '100%',
    cursor: onOpen ? 'pointer' : 'default',
    ...(isHighlighted
      ? {
          boxShadow: `0 0 0 2px ${euiTheme.colors.primary}`,
          backgroundColor: euiTheme.colors.lightestShade,
        }
      : {}),
  });

  const severityBadgeCss = css({
    backgroundColor: `${severityColor}22`,
    color: severityColor,
  });

  const envHitsBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseDanger,
    color: euiTheme.colors.danger,
  });

  return (
    <EuiPanel
      panelRef={cardRef}
      hasBorder
      paddingSize="m"
      data-test-subj={`threatIntelReportCard-${item.reportId}`}
      css={panelCss}
      onClick={onOpen ? handleOpen : undefined}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={
        onOpen
          ? (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleOpen();
              }
            }
          : undefined
      }
    >
      <EuiText size="m">
        <strong>{displayTitle}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        {faviconUrl ? (
          <EuiFlexItem grow={false}>
            <img
              src={faviconUrl}
              alt=""
              width={14}
              height={14}
              style={{ borderRadius: 2 }}
              aria-hidden
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj={`threatIntelReportCardMeta-${item.reportId}`}
          >
            {item.sourceName}
            {primaryCategoryLabel ? (
              <>
                <span css={metaDividerCss} aria-hidden>
                  {'·'}
                </span>
                {primaryCategoryLabel}
              </>
            ) : null}
            {publishedDate && !Number.isNaN(publishedDate.getTime()) ? (
              <>
                <span css={metaDividerCss} aria-hidden>
                  {'·'}
                </span>
                <FormattedRelative value={publishedDate} />
              </>
            ) : null}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {item.categories.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
            {item.categories.slice(0, 3).map((category) => (
              <EuiFlexItem key={`${item.reportId}-cat-${category}`} grow={false}>
                <ThreatCategoryBadge category={category} size="sm" />
              </EuiFlexItem>
            ))}
            {item.categories.length > 3 ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.reportFeed.moreCategories',
                    {
                      defaultMessage: '+{count}',
                      values: { count: item.categories.length - 3 },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge
                css={severityBadgeCss}
                data-test-subj={`threatIntelReportCardSeverity-${item.reportId}`}
              >
                {getSeverityLabel(item.severity)}
              </EuiBadge>
            </EuiFlexItem>
            {envHits > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiBadge css={envHitsBadgeCss}>
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.reportFeed.envHitsBadge',
                    {
                      defaultMessage: '{count} env hits',
                      values: { count: envHits },
                    }
                  )}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="inspect"
            onClick={handleCorrelate}
            data-test-subj={`threatIntelReportCardCorrelate-${item.reportId}`}
          >
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.reportFeed.correlateAction',
              { defaultMessage: 'Correlate' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
