/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  type EuiSearchBarProps,
  type Query,
  transparentize,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AwsService } from './ingest_hub/aws_services_data';

type AwsServiceBrowseGroupId = 'all' | 'logs' | 'metrics';

const AWS_SERVICE_BROWSE_GROUP_ORDER: readonly AwsServiceBrowseGroupId[] = [
  'all',
  'logs',
  'metrics',
];

const AWS_SERVICE_GRID_SCROLL_HEIGHT_PX = 540;

function awsBrowseGroupTitle(id: AwsServiceBrowseGroupId): string {
  switch (id) {
    case 'all':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.browseGroup.all', {
        defaultMessage: 'All',
      });
    case 'logs':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.browseGroup.logs', {
        defaultMessage: 'Logs',
      });
    case 'metrics':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.browseGroup.metrics', {
        defaultMessage: 'Metrics',
      });
    default:
      return id;
  }
}

function parseAwsServiceSearchText(query: Query | null | undefined): string {
  if (!query?.ast) {
    return '';
  }

  const termClauses = query.ast.getTermClauses?.() ?? [];
  if (termClauses.length === 0) {
    return '';
  }

  return termClauses
    .map((clause) => (clause?.value != null ? String(clause.value) : ''))
    .join(' ')
    .trim();
}

function awsServiceDataTypeBadgeLabel(
  serviceId: string,
  logsServiceIdSet: ReadonlySet<string>
): string {
  return logsServiceIdSet.has(serviceId)
    ? awsBrowseGroupTitle('logs')
    : awsBrowseGroupTitle('metrics');
}

function servicesForBrowseGroup(
  groupId: AwsServiceBrowseGroupId,
  catalog: readonly AwsService[],
  logsServiceIdSet: ReadonlySet<string>
): AwsService[] {
  if (groupId === 'all') {
    return [...catalog].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (groupId === 'logs') {
    return [...catalog]
      .filter((s) => logsServiceIdSet.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...catalog]
    .filter((s) => !logsServiceIdSet.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const LogoBadge: React.FC<{ src: string; alt: string; size?: number }> = ({
  src,
  alt,
  size = 32,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }}
      />
    </div>
  );
};

const AwsServicePickerScrollArea: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const scrollBarCss = useEuiScrollBar();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edgeShadows, setEdgeShadows] = useState({ top: false, bottom: false });

  const syncEdgeShadows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = el;
    const epsilon = 2;
    const next =
      scrollHeight <= clientHeight + epsilon
        ? { top: false, bottom: false }
        : {
            top: scrollTop > epsilon,
            bottom: scrollTop + clientHeight < scrollHeight - epsilon,
          };
    setEdgeShadows((prev) => (prev.top === next.top && prev.bottom === next.bottom ? prev : next));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    syncEdgeShadows();
    const onScroll = () => syncEdgeShadows();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', syncEdgeShadows);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', syncEdgeShadows);
    };
  }, [syncEdgeShadows]);

  const edge = transparentize(euiTheme.colors.emptyShade, 0.72);
  const edgeMid = transparentize(euiTheme.colors.emptyShade, 0.34);
  const fadeHeight = `calc(${euiTheme.size.xl} + ${euiTheme.size.xl} + ${euiTheme.size.l} + ${euiTheme.size.m} + ${euiTheme.size.m} + ${euiTheme.size.s})`;
  const borderClearance = euiTheme.border.width.thin;
  const fadeOutsetInline = `calc(-1 * ${euiTheme.size.xs})`;

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <div
        aria-hidden
        css={css`
          pointer-events: none;
          position: absolute;
          inset-inline: ${fadeOutsetInline};
          top: 0;
          height: ${fadeHeight};
          z-index: 2;
          opacity: ${edgeShadows.top ? 1 : 0};
          transition: opacity ${euiTheme.animation.fast} ease-out;
          background: linear-gradient(to bottom, ${edge} 0%, ${edgeMid} 38%, transparent 85%);
        `}
      />
      <div
        aria-hidden
        css={css`
          pointer-events: none;
          position: absolute;
          inset-inline: ${fadeOutsetInline};
          bottom: ${borderClearance};
          height: ${fadeHeight};
          z-index: 2;
          opacity: ${edgeShadows.bottom ? 1 : 0};
          transition: opacity ${euiTheme.animation.fast} ease-out;
          background: linear-gradient(to top, ${edge} 0%, ${edgeMid} 38%, transparent 85%);
        `}
      />
      <div
        ref={scrollRef}
        tabIndex={0}
        data-test-subj="awsOnboardingStep2ServiceGridScroll"
        css={css`
          ${scrollBarCss}
          max-height: ${AWS_SERVICE_GRID_SCROLL_HEIGHT_PX}px;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          &:focus {
            outline: none;
          }
        `}
      >
        {children}
      </div>
    </div>
  );
};

export interface AwsOnboardingSelectServicesStepProps {
  readonly catalog: readonly AwsService[];
  readonly logsServiceIdSet: ReadonlySet<string>;
  readonly manualServiceIds: ReadonlySet<string>;
  readonly onSetManualServiceIds: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
}

export const AwsOnboardingSelectServicesStep: React.FC<AwsOnboardingSelectServicesStepProps> = ({
  catalog,
  logsServiceIdSet,
  manualServiceIds,
  onSetManualServiceIds,
}) => {
  const { euiTheme } = useEuiTheme();
  const [awsServiceBrowseGroup, setAwsServiceBrowseGroup] =
    useState<AwsServiceBrowseGroupId>('all');
  const [awsServiceBrowseQuery, setAwsServiceBrowseQuery] = useState<Query>(
    EuiSearchBar.Query.MATCH_ALL
  );

  const awsBrowseServiceSearch = useMemo(
    () => parseAwsServiceSearchText(awsServiceBrowseQuery),
    [awsServiceBrowseQuery]
  );

  const servicesInActiveBrowseGroup = useMemo(
    () => servicesForBrowseGroup(awsServiceBrowseGroup, catalog, logsServiceIdSet),
    [awsServiceBrowseGroup, catalog, logsServiceIdSet]
  );

  const browseGroupFilteredServices = useMemo(() => {
    const q = awsBrowseServiceSearch.trim().toLowerCase();
    if (!q) {
      return servicesInActiveBrowseGroup;
    }
    return servicesInActiveBrowseGroup.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.useCase.toLowerCase().includes(q)
    );
  }, [servicesInActiveBrowseGroup, awsBrowseServiceSearch]);

  const allBrowseGroupFilteredSelected = useMemo(
    () =>
      browseGroupFilteredServices.length > 0 &&
      browseGroupFilteredServices.every((s) => manualServiceIds.has(s.id)),
    [browseGroupFilteredServices, manualServiceIds]
  );

  const onServiceCheckedChange = useCallback(
    (serviceId: string, isChecked: boolean) => {
      onSetManualServiceIds((prev) => {
        if (prev.has(serviceId) === isChecked) {
          return prev;
        }
        const next = new Set(prev);
        if (isChecked) {
          next.add(serviceId);
        } else {
          next.delete(serviceId);
        }
        return next;
      });
    },
    [onSetManualServiceIds]
  );

  const onAwsServiceBrowseQueryChange = useCallback<EuiSearchBarProps['onChange']>(
    ({ query, error }) => {
      if (error || !query) {
        return;
      }
      setAwsServiceBrowseQuery(query);
    },
    []
  );

  const onSelectAllVisibleServices = useCallback(() => {
    onSetManualServiceIds((prev) => {
      const visibleServiceIds = browseGroupFilteredServices.map((service) => service.id);
      if (visibleServiceIds.length === 0) {
        return prev;
      }

      const allVisibleSelected = visibleServiceIds.every((id) => prev.has(id));
      const next = new Set(prev);

      if (allVisibleSelected) {
        for (const id of visibleServiceIds) {
          next.delete(id);
        }
      } else {
        for (const id of visibleServiceIds) {
          next.add(id);
        }
      }

      if (
        next.size === prev.size &&
        visibleServiceIds.every((id) => prev.has(id) === next.has(id))
      ) {
        return prev;
      }

      return next;
    });
  }, [browseGroupFilteredServices, onSetManualServiceIds]);

  const awsServiceBrowseToolbarShellCss = useMemo(
    () => css`
      .euiFlexGroup:has(.euiSearchBar__searchHolder) {
        align-items: center;
        flex-wrap: nowrap;
      }

      .euiSearchBar__searchHolder {
        min-width: 0;
        flex-grow: 1;
      }
    `,
    []
  );

  const awsServicePickerGridCss = useMemo(
    () => css`
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: ${euiTheme.size.s};
      @media (max-width: ${euiTheme.breakpoint.m}px) {
        grid-template-columns: 1fr;
      }
    `,
    [euiTheme.breakpoint.m, euiTheme.size.s]
  );

  const awsServiceCheckableCardCss = useMemo(
    () =>
      css`
        overflow: visible;

        & [class*='euiSplitPanel'] {
          overflow: visible;
        }

        p {
          margin: 0;
        }
        & [class*='euiSplitPanel__inner']:not(:has([class*='euiCheckableCard__label'])) {
          display: flex;
          align-items: center;
          justify-content: center;
          border-inline-end: none !important;
        }
        & [class*='euiCheckableCard__label'] {
          padding: ${euiTheme.size.m};
          min-width: 0;
        }
      `,
    [euiTheme.size.m]
  );

  return (
    <>
      <div css={awsServiceBrowseToolbarShellCss} data-test-subj="awsOnboardingServiceBrowseToolbar">
        <EuiSearchBar
          box={{
            compressed: true,
            incremental: true,
            placeholder: i18n.translate('xpack.observabilityOnboarding.awsPage.step2.search', {
              defaultMessage: 'Search AWS services…',
            }),
            'data-test-subj': 'observabilityOnboardingStepsFieldSearch',
          }}
          query={awsServiceBrowseQuery}
          onChange={onAwsServiceBrowseQueryChange}
          toolsRight={
            <EuiButtonGroup
              data-test-subj="awsOnboardingServiceBrowseGroup"
              legend={i18n.translate(
                'xpack.observabilityOnboarding.awsPage.step2.browseGroupLegend',
                {
                  defaultMessage: 'Browse AWS integrations by category',
                }
              )}
              buttonSize="compressed"
              idSelected={awsServiceBrowseGroup}
              onChange={(id) => setAwsServiceBrowseGroup(id as AwsServiceBrowseGroupId)}
              options={AWS_SERVICE_BROWSE_GROUP_ORDER.map((groupId) => ({
                id: groupId,
                label: awsBrowseGroupTitle(groupId),
              }))}
            />
          }
        />
      </div>
      <EuiSpacer size="m" />
      <div data-test-subj="awsOnboardingStep2IndividualServicesPanel">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={true}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.observabilityOnboarding.awsPage.step2.listHeader', {
                defaultMessage:
                  '{count, plural, one {# service selected} other {# services selected}}',
                values: { count: manualServiceIds.size },
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityOnboardingStepsSelectAllVisibleButton"
              size="xs"
              disabled={browseGroupFilteredServices.length === 0}
              onClick={onSelectAllVisibleServices}
            >
              {allBrowseGroupFilteredSelected
                ? i18n.translate('xpack.observabilityOnboarding.awsPage.step2.deselectAll', {
                    defaultMessage: 'Deselect all',
                  })
                : i18n.translate('xpack.observabilityOnboarding.awsPage.step2.selectAll', {
                    defaultMessage: 'Select all',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <AwsServicePickerScrollArea>
          <div css={awsServicePickerGridCss}>
            {browseGroupFilteredServices.map((svc) => {
              const checked = manualServiceIds.has(svc.id);
              return (
                <EuiCheckableCard
                  key={svc.id}
                  id={`pwr-${svc.id}`}
                  checkableType="checkbox"
                  checked={checked}
                  onChange={(event) => onServiceCheckedChange(svc.id, event.target.checked)}
                  css={awsServiceCheckableCardCss}
                  label={
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <LogoBadge src={svc.logoUrl} alt="" size={26} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                        <strong>{svc.name}</strong>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color="hollow"
                          data-test-subj={`awsOnboardingServiceDataTypeBadge-${svc.id}`}
                        >
                          {awsServiceDataTypeBadgeLabel(svc.id, logsServiceIdSet)}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                />
              );
            })}
          </div>
        </AwsServicePickerScrollArea>
      </div>
    </>
  );
};
