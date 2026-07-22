/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getThreatCategoryLabel } from '../../../../common/threat_intelligence/hub';
import type { ThreatReportFeedItem } from './types';
import { getSeverityLabel } from './severity_labels';
import { ThreatCategoryBadge } from './threat_category_badge';

interface Props {
  item: ThreatReportFeedItem;
  onClose: () => void;
}

const titleCase = (value: string): string =>
  value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const ThreatReportFlyoutComponent: React.FC<Props> = ({ item, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const publishedDate = item.publishedAt ? new Date(item.publishedAt) : undefined;
  const primaryCategoryLabel =
    item.categories.length > 0 ? getThreatCategoryLabel(item.categories[0]) : undefined;
  const envHits = item.environmentHitsTotal ?? 0;
  const sourceMeta = [item.sourceName, primaryCategoryLabel].filter(Boolean).join(' · ');

  const eyebrowCss = css({
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  });

  const metaBadgeCss = css({
    backgroundColor: euiTheme.colors.emptyShade,
    color: euiTheme.colors.textParagraph,
    border: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
  });

  const envHitsBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseDanger,
    color: euiTheme.colors.danger,
  });

  const regionBadgeCss = css({
    backgroundColor: euiTheme.colors.emptyShade,
    color: euiTheme.colors.textParagraph,
    border: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <EuiFlyout
      onClose={handleClose}
      size="m"
      ownFocus
      aria-labelledby="threatIntelThreatReportFlyoutTitle"
      data-test-subj="threatIntelThreatReportFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiText size="xs" color="subdued" css={eyebrowCss}>
          <strong>
            {i18n.translate('xpack.securitySolution.threatIntelligence.reportFeed.flyoutEyebrow', {
              defaultMessage: 'Threat report',
            })}
          </strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiTitle size="s">
          <h2 id="threatIntelThreatReportFlyoutTitle">{item.title || item.reportId}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge css={metaBadgeCss}>{titleCase(getSeverityLabel(item.severity))}</EuiBadge>
          </EuiFlexItem>
          {sourceMeta ? (
            <EuiFlexItem grow={false}>
              <EuiBadge css={metaBadgeCss}>{sourceMeta}</EuiBadge>
            </EuiFlexItem>
          ) : null}
          {publishedDate && !Number.isNaN(publishedDate.getTime()) ? (
            <EuiFlexItem grow={false}>
              <EuiBadge css={metaBadgeCss}>
                <FormattedRelative value={publishedDate} />
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          {envHits > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiBadge css={envHitsBadgeCss}>
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.reportFeed.flyoutEnvHits',
                  {
                    defaultMessage: '{count} env hits',
                    values: { count: envHits },
                  }
                )}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {item.bodyText ? (
          <EuiText size="s">
            {item.bodyText.split(/\n+/).map((paragraph, index) => (
              <p key={`${item.reportId}-p-${index}`}>{paragraph}</p>
            ))}
          </EuiText>
        ) : (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.securitySolution.threatIntelligence.reportFeed.flyoutNoBody', {
                defaultMessage: 'No report summary is available for this item.',
              })}
            </p>
          </EuiText>
        )}

        {item.categories.length > 0 ? (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiText size="s">
              <h3>
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.reportFeed.flyoutCategories',
                  { defaultMessage: 'Categories' }
                )}
              </h3>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {item.categories.map((category) => (
                <EuiFlexItem key={`${item.reportId}-flyout-cat-${category}`} grow={false}>
                  <ThreatCategoryBadge category={category} size="md" />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}

        {item.regions && item.regions.length > 0 ? (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiText size="s">
              <h3>
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.reportFeed.flyoutRegions',
                  { defaultMessage: 'Regions' }
                )}
              </h3>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {item.regions.map((region) => (
                <EuiFlexItem key={`${item.reportId}-flyout-region-${region}`} grow={false}>
                  <EuiBadge css={regionBadgeCss}>{region}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={handleClose}
              data-test-subj="threatIntelThreatReportFlyoutClose"
            >
              {i18n.translate('xpack.securitySolution.threatIntelligence.reportFeed.flyoutClose', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const ThreatReportFlyout = React.memo(ThreatReportFlyoutComponent);
