/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../common/ebt_constants';
import { nightshiftInteractiveSurfaceTransition } from '../common/transition';
import type { ImpactedServiceChip } from './impacted_services_chips';

export const MAX_VISIBLE_IMPACTED_SERVICES = 10;

interface ImpactedServiceButtonProps {
  count: number;
  isSelected: boolean;
  name: string;
  onClick: () => void;
}

function ImpactedServiceButton({ count, isSelected, name, onClick }: ImpactedServiceButtonProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <button
      aria-label={i18n.translate('xpack.nightshift.impactedServicesChipAriaLabel', {
        defaultMessage: '{name}: {count}',
        values: { count, name },
      })}
      aria-pressed={isSelected}
      data-test-subj="impacted-services-chip"
      {...getEbtProps({
        action: isSelected
          ? NIGHTSHIFT_EBT_ACTIONS.CLEAR_IMPACTED_SERVICES_FILTER
          : NIGHTSHIFT_EBT_ACTIONS.FILTER_BY_IMPACTED_SERVICES,
        element: NIGHTSHIFT_EBT_ELEMENTS.IMPACTED_SERVICES,
        detail: NIGHTSHIFT_EBT_DETAILS.IMPACTED_SERVICE_TYPE,
      })}
      css={css`
        align-items: center;
        background: ${isSelected
          ? euiTheme.colors.backgroundBaseDanger
          : euiTheme.colors.backgroundBasePlain};
        border: ${isSelected
          ? `${euiTheme.border.width.thin} solid ${euiTheme.colors.danger}`
          : euiTheme.border.thin};
        border-radius: ${euiTheme.size.base};
        box-sizing: border-box;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        gap: ${euiTheme.size.xs};
        height: ${euiTheme.size.xl};
        min-width: auto;
        padding: 0 calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
        transition: ${nightshiftInteractiveSurfaceTransition(euiTheme)};

        &:hover {
          background: ${isSelected
            ? euiTheme.colors.backgroundBaseDanger
            : euiTheme.colors.backgroundBaseInteractiveHover};
          border-color: ${isSelected
            ? euiTheme.colors.danger
            : euiTheme.colors.borderInteractiveFormsHoverPlain};
        }

        &:focus-visible {
          outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
          outline-offset: ${euiTheme.border.width.thin};
        }
      `}
      onClick={onClick}
      type="button"
    >
      <span
        css={css`
          align-items: center;
          display: inline-flex;
          padding: 0 calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
        `}
      >
        <EuiText size="xs">{name}</EuiText>
      </span>
      <EuiBadge
        color="danger"
        css={css`
          flex-shrink: 0;

          .euiBadge__content {
            align-items: center;
            display: flex;
            line-height: 1;
          }
        `}
      >
        {count}
      </EuiBadge>
    </button>
  );
}

export interface ImpactedServicesProps {
  services: ImpactedServiceChip[];
  onSelect: (chipKey: string) => void;
  selectedServiceKey?: string;
}

export function ImpactedServices({
  services,
  onSelect,
  selectedServiceKey,
}: ImpactedServicesProps): React.ReactElement | null {
  const { euiTheme } = useEuiTheme();
  const titleFontSize = useEuiFontSize('s');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [services]);

  const hasOverflow = services.length > MAX_VISIBLE_IMPACTED_SERVICES;
  const visibleServices = useMemo(() => {
    if (!hasOverflow || expanded) {
      return services;
    }

    const collapsed = services.slice(0, MAX_VISIBLE_IMPACTED_SERVICES);
    if (!selectedServiceKey) {
      return collapsed;
    }

    const selectedIndex = services.findIndex(({ key }) => key === selectedServiceKey);
    if (selectedIndex < 0 || selectedIndex < MAX_VISIBLE_IMPACTED_SERVICES) {
      return collapsed;
    }

    // Keep the active filter chip visible when collapsing past the first page.
    return [...collapsed.slice(0, MAX_VISIBLE_IMPACTED_SERVICES - 1), services[selectedIndex]];
  }, [services, expanded, hasOverflow, selectedServiceKey]);
  const hiddenCount = Math.max(services.length - visibleServices.length, 0);

  if (services.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${euiTheme.size.l};
      `}
    >
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="m"
        css={css`
          border-radius: ${euiTheme.size.s};
        `}
      >
        <span
          css={css`
            ${titleFontSize}
            display: block;
            font-weight: ${euiTheme.font.weight.medium};
            margin-bottom: ${euiTheme.size.m};
          `}
        >
          {i18n.translate('xpack.nightshift.impactedServicesTitle', {
            defaultMessage: 'Impacted services',
          })}
        </span>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          responsive={false}
          wrap={true}
          css={css`
            gap: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
          `}
        >
          {visibleServices.map(({ count, key, name }) => (
            <EuiFlexItem grow={false} key={key}>
              <ImpactedServiceButton
                count={count}
                isSelected={selectedServiceKey === key}
                name={name}
                onClick={() => onSelect(key)}
              />
            </EuiFlexItem>
          ))}
          {hasOverflow && !expanded && (
            <EuiFlexItem
              grow={false}
              css={css`
                margin-left: ${euiTheme.size.xxs};
              `}
            >
              <EuiButtonEmpty
                data-test-subj="impacted-services-show-more"
                flush="left"
                onClick={() => setExpanded(true)}
                size="xs"
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.EXPAND_IMPACTED_SERVICES,
                  element: NIGHTSHIFT_EBT_ELEMENTS.IMPACTED_SERVICES,
                })}
              >
                {i18n.translate('xpack.nightshift.impactedServicesShowMore', {
                  defaultMessage: '+{count} more',
                  values: { count: hiddenCount },
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {hasOverflow && expanded && (
            <EuiFlexItem
              grow={false}
              css={css`
                margin-left: ${euiTheme.size.xxs};
              `}
            >
              <EuiButtonEmpty
                data-test-subj="impacted-services-show-less"
                flush="left"
                onClick={() => setExpanded(false)}
                size="xs"
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.COLLAPSE_IMPACTED_SERVICES,
                  element: NIGHTSHIFT_EBT_ELEMENTS.IMPACTED_SERVICES,
                })}
              >
                {i18n.translate('xpack.nightshift.impactedServicesShowLess', {
                  defaultMessage: 'Show less',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
}
