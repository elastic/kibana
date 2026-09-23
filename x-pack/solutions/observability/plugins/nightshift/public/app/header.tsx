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
  isLoading?: boolean;
  hasActiveInvestigations?: boolean;
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
  isLoading,
  hasActiveInvestigations,
}: {
  isLoading: boolean;
  hasActiveInvestigations: boolean;
}): string => {
  if (isLoading) {
    return i18n.translate('xpack.nightshift.hero.checkingTitle', {
      defaultMessage: 'Looking into your data...',
    });
  }

  if (hasActiveInvestigations) {
    return i18n.translate('xpack.nightshift.hero.investigationsRunningTitle', {
      defaultMessage: 'Investigations are underway',
    });
  }

  return i18n.translate('xpack.nightshift.hero.allClearTitle', {
    defaultMessage: "You're all caught up",
  });
};

export function NightshiftHeader({
  isLoading = false,
  hasActiveInvestigations = false,
  showAllEventsHref,
}: NightshiftHeaderProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  const title = getHeroTitle({ isLoading, hasActiveInvestigations });

  return (
    <EuiFlexItem
      grow={false}
      css={css`
        padding: 0;
      `}
    >
      <EuiFlexGroup
        alignItems="flexEnd"
        direction="row"
        gutterSize="l"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="m" responsive={false}>
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
              <EuiText color="subdued" size="s" textAlign="left">
                <p>{getGreeting()}</p>
              </EuiText>
              <EuiTitle
                size="m"
                css={css`
                  font-size: calc(${euiTheme.size.l} + ${euiTheme.size.xxs});
                  font-weight: ${euiTheme.font.weight.medium};
                  line-height: ${euiTheme.size.xl};
                  text-align: left;
                  white-space: nowrap;
                `}
              >
                <h2>{title}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {showAllEventsHref && (
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
