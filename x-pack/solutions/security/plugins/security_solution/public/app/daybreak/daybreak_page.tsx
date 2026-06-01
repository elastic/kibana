/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Daybreak landing page for the Security solution.
 *
 * Mounted at `/app/security/daybreak`. Renders the "Healthy" state of
 * the autonomous Security mode — same visual language as the
 * Nightshift / VectorDB surfaces (centered header avatar + title +
 * description, single Overview panel with a stat grid).
 *
 * Intentionally kept lightweight: the standard Security `HomePage`
 * pulls in heavy initialization machinery (sourcerer, drag-drop
 * context, data view manager, etc.) which is unnecessary for a
 * read-only status page. We render outside `HomePage` so first-paint
 * is fast.
 */

type StatVariant = 'success' | 'warning' | 'subdued' | 'none';

interface OverviewStat {
  id: string;
  label: string;
  iconType?: IconType;
  value: string;
  variant: StatVariant;
}

const OVERVIEW_STATS: OverviewStat[] = [
  {
    id: 'openCases',
    label: i18n.translate('xpack.securitySolution.daybreak.stat.openCases', {
      defaultMessage: 'Open cases',
    }),
    iconType: 'casesApp',
    value: '0',
    variant: 'success',
  },
  {
    id: 'rulesRunning',
    label: i18n.translate('xpack.securitySolution.daybreak.stat.rulesRunning', {
      defaultMessage: 'Rules running',
    }),
    iconType: 'gear',
    value: '42',
    variant: 'subdued',
  },
  {
    id: 'detections',
    label: i18n.translate('xpack.securitySolution.daybreak.stat.detections', {
      defaultMessage: 'Detections (24h)',
    }),
    iconType: 'alert',
    value: '8',
    variant: 'subdued',
  },
  {
    id: 'criticalAlerts',
    label: i18n.translate('xpack.securitySolution.daybreak.stat.criticalAlerts', {
      defaultMessage: 'Critical alerts',
    }),
    iconType: 'warningFilled',
    value: '0',
    variant: 'success',
  },
  {
    id: 'endpoints',
    label: i18n.translate('xpack.securitySolution.daybreak.stat.endpoints', {
      defaultMessage: 'Endpoints',
    }),
    iconType: 'desktop',
    value: '128',
    variant: 'subdued',
  },
  {
    id: 'integrations',
    label: i18n.translate('xpack.securitySolution.daybreak.stat.integrations', {
      defaultMessage: 'Integrations',
    }),
    iconType: 'package',
    value: '14',
    variant: 'subdued',
  },
];

const STAT_GLYPH_BG_SIZE = 24;

const getStatGlyphColors = (
  variant: StatVariant,
  theme: ReturnType<typeof useEuiTheme>['euiTheme']
): { background: string; iconColor: string } => {
  switch (variant) {
    case 'success':
      return {
        background: theme.colors.backgroundBaseSuccess,
        iconColor: theme.colors.textSuccess,
      };
    case 'warning':
      return {
        background: theme.colors.backgroundBaseWarning,
        iconColor: theme.colors.textWarning,
      };
    case 'subdued':
    default:
      return {
        background: theme.colors.borderBaseSubdued,
        iconColor: theme.colors.textSubdued,
      };
  }
};

export const DaybreakPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="daybreakPage"
      css={css`
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        min-height: var(--kbn-application--content-height, 100vh);
        padding: 64px 16px 0;
      `}
    >
      <div
        css={css`
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding-bottom: 16px;
        `}
      >
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          gutterSize="l"
          responsive={false}
          css={css`
            width: 100%;
            max-width: 753px;
            margin: 0 auto;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                {/*
                 * Health avatar — danger-tinted because the Daybreak
                 * "Healthy" status today is actually flagging an active
                 * attack. We keep the sun icon (Daybreak brand) but
                 * paint the wrapper red so the page reads as "something
                 * needs your attention" at a glance.
                 */}
                <div
                  aria-hidden
                  css={css`
                    width: 40px;
                    height: 40px;
                    border-radius: 20px;
                    background: ${euiTheme.colors.backgroundBaseDanger};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiIcon type="sun" size="l" color={euiTheme.colors.textDanger} />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="m">
                  <h2>
                    {i18n.translate('xpack.securitySolution.daybreak.title', {
                      defaultMessage:
                        'You have 1 attack and 2 critical alerts that require your action',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  size="s"
                  color="subdued"
                  textAlign="center"
                  css={css`
                    max-width: 596px;
                  `}
                >
                  <p>
                    {i18n.translate('xpack.securitySolution.daybreak.description', {
                      defaultMessage:
                        'Top priority: An active attack is targeting your critical infrastructure.',
                    })}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
            css={css`
              width: 100%;
            `}
          >
            <EuiPanel
              paddingSize="none"
              hasShadow={false}
              hasBorder
              color="plain"
              css={css`
                overflow: hidden;
                border-radius: 12px;
                border-color: ${euiTheme.colors.borderBaseSubdued};
              `}
            >
              <div
                css={css`
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                  padding: ${euiTheme.size.l};
                `}
              >
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  responsive={false}
                  gutterSize="s"
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <h6>
                        {i18n.translate('xpack.securitySolution.daybreak.overviewLabel', {
                          defaultMessage: 'Overview',
                        })}
                      </h6>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="sun" color="subdued" />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiFlexGrid columns={3} gutterSize="s">
                  {OVERVIEW_STATS.map((stat) => {
                    const showGlyph = stat.variant !== 'none' && Boolean(stat.iconType);
                    const { background, iconColor } = getStatGlyphColors(stat.variant, euiTheme);
                    return (
                      <EuiFlexItem key={stat.id}>
                        <EuiPanel paddingSize="s" hasShadow={false} hasBorder color="plain">
                          <EuiText size="xs">
                            <strong>{stat.label}</strong>
                          </EuiText>
                          <EuiSpacer size="xs" />
                          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                            {showGlyph && (
                              <EuiFlexItem grow={false}>
                                <span
                                  css={css`
                                    display: inline-flex;
                                    align-items: center;
                                    justify-content: center;
                                    width: ${STAT_GLYPH_BG_SIZE}px;
                                    height: ${STAT_GLYPH_BG_SIZE}px;
                                    border-radius: ${euiTheme.border.radius.small};
                                    background: ${background};
                                  `}
                                >
                                  <EuiIcon
                                    type={stat.iconType ?? 'empty'}
                                    size="s"
                                    color={iconColor}
                                  />
                                </span>
                              </EuiFlexItem>
                            )}
                            <EuiFlexItem grow={false}>
                              <EuiText size="m">
                                <strong>{stat.value}</strong>
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiPanel>
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGrid>
              </div>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
