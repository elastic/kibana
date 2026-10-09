/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NightshiftMarkIcon } from '@kbn/observability-shared-plugin/public';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

export interface NightshiftHeaderProps {
  isEmptyState?: boolean;
  isLoading?: boolean;
  hasNeedsAction?: boolean;
  showAllEventsHref?: string;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return i18n.translate('xpack.nightshift.hero.morningGreetingDescription', {
      defaultMessage: 'Good morning!',
    });
  }

  if (hour < 18) {
    return i18n.translate('xpack.nightshift.hero.afternoonGreetingDescription', {
      defaultMessage: 'Good afternoon!',
    });
  }

  return i18n.translate('xpack.nightshift.hero.eveningGreetingDescription', {
    defaultMessage: 'Good evening!',
  });
};

const getHeroTitle = ({
  isEmptyState,
  isLoading,
  hasNeedsAction,
}: {
  isEmptyState: boolean;
  isLoading: boolean;
  hasNeedsAction: boolean;
}): string => {
  if (isLoading) {
    return i18n.translate('xpack.nightshift.hero.checkingTitle', {
      defaultMessage: 'Looking into your data...',
    });
  }

  if (isEmptyState) {
    return i18n.translate('xpack.nightshift.hero.noEventsTitle', {
      defaultMessage: 'No significant events found',
    });
  }

  if (hasNeedsAction) {
    return i18n.translate('xpack.nightshift.hero.needsActionTitle', {
      defaultMessage: 'Some significant events need action',
    });
  }

  return i18n.translate('xpack.nightshift.hero.allClearTitle', {
    defaultMessage: "You're all caught up",
  });
};

export function NightshiftHeader({
  isEmptyState = false,
  isLoading = false,
  hasNeedsAction = false,
  showAllEventsHref,
}: NightshiftHeaderProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  const title = getHeroTitle({ isEmptyState, isLoading, hasNeedsAction });

  return (
    <EuiFlexItem
      grow={false}
      css={css`
        padding: ${isEmptyState ? euiTheme.size.m : 0} 0 ${euiTheme.size.m};
      `}
    >
      <EuiFlexGroup
        alignItems={isEmptyState ? 'center' : 'flexEnd'}
        direction={isEmptyState ? 'column' : 'row'}
        gutterSize={isEmptyState ? 'none' : 'l'}
        justifyContent={isEmptyState ? 'center' : 'spaceBetween'}
        responsive={false}
      >
        <EuiFlexItem grow={!isEmptyState}>
          <EuiFlexGroup
            alignItems="center"
            direction={isEmptyState ? 'column' : 'row'}
            gutterSize={isEmptyState ? 's' : 'm'}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <div
                aria-label={i18n.translate('xpack.nightshift.hero.nightshiftIconAriaLabel', {
                  defaultMessage: 'Nightshift',
                })}
                role="img"
                css={css`
                  align-items: center;
                  background: linear-gradient(
                    99.4deg,
                    ${euiTheme.colors.backgroundLightPrimary} 3.97%,
                    ${euiTheme.colors.backgroundLightAssistance} 65.6%
                  );
                  border-radius: 50%;
                  color: ${euiTheme.colors.textAssistance};
                  display: inline-flex;
                  height: calc(${euiTheme.size.xxl} + ${euiTheme.size.m});
                  justify-content: center;
                  width: calc(${euiTheme.size.xxl} + ${euiTheme.size.m});
                `}
              >
                <NightshiftMarkIcon />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s" textAlign={isEmptyState ? 'center' : 'left'}>
                <p>{getGreeting()}</p>
              </EuiText>
              <EuiTitle
                size="m"
                css={css`
                  font-size: calc(${euiTheme.size.l} + ${euiTheme.size.xxs});
                  font-weight: ${euiTheme.font.weight.medium};
                  line-height: ${euiTheme.size.xl};
                  text-align: ${isEmptyState ? 'center' : 'left'};
                  white-space: nowrap;
                `}
              >
                <h2>{title}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {!isEmptyState && showAllEventsHref && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="text"
              data-test-subj="o11yNightshiftAppShowAllLink"
              href={showAllEventsHref}
              size="s"
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.VIEW_ALL_SIGNIFICANT_EVENTS,
                element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
              })}
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              {i18n.translate('xpack.nightshift.summary.showAllEventsLinkText', {
                defaultMessage: 'Show all events',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
