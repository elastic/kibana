/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

const getPndGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return i18n.translate('xpack.pnd.hero.morningGreetingDescription', {
      defaultMessage: 'Good morning!',
    });
  }

  if (hour < 18) {
    return i18n.translate('xpack.pnd.hero.afternoonGreetingDescription', {
      defaultMessage: 'Good afternoon!',
    });
  }

  return i18n.translate('xpack.pnd.hero.eveningGreetingDescription', {
    defaultMessage: 'Good evening!',
  });
};

const getPndHeroTitle = ({
  isQueueEmpty,
  isLoading,
  hasNeedsAction,
  eventCount,
}: {
  isQueueEmpty: boolean;
  isLoading: boolean;
  hasNeedsAction: boolean;
  eventCount: number;
}): string => {
  if (isLoading) {
    return i18n.translate('xpack.pnd.hero.checkingTitle', {
      defaultMessage: 'Looking into your data...',
    });
  }

  if (isQueueEmpty) {
    return i18n.translate('xpack.pnd.hero.noEventsTitle', {
      defaultMessage: 'No events found',
    });
  }

  if (hasNeedsAction) {
    return i18n.translate('xpack.pnd.hero.needsActionTitle', {
      defaultMessage: '{eventCount, plural, one {# event needs you} other {# events need you}}',
      values: {
        eventCount,
      },
    });
  }

  return i18n.translate('xpack.pnd.hero.allClearTitle', {
    defaultMessage: "You're all caught up",
  });
};

export interface PndPageHeaderProps {
  isQueueEmpty?: boolean;
  isLoading?: boolean;
  eventCount?: number;
}
/**
 * Page header for PND routes.
 *
 * Important: keep everything in `EuiPageHeader` children and do **not** pass
 * `rightSideItems` into EUI. When `rightSideItems` is set, EUI leaves the
 * children-only path and prepends an `EuiSpacer` before custom children —
 * which pushes Watches (and any page with actions) down vs placeholders.
 */
export const PndPageHeader: React.FC<PndPageHeaderProps> = ({
  isQueueEmpty = false,
  isLoading = false,
  eventCount = 0,
}) => {
  const { euiTheme } = useEuiTheme();
  const title = getPndHeroTitle({
    isQueueEmpty,
    isLoading,
    hasNeedsAction: eventCount > 0,
    eventCount,
  });
  return (
    <>
      <EuiPageHeader
        alignItems="center"
        bottomBorder={false}
        responsive
        data-test-subj="pndPageHeader"
      >
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="s"
          responsive={false}
          wrap
        >
          <EuiFlexItem grow={false}>
            <div
              aria-label={i18n.translate('xpack.pnd.hero.pndIconAriaLabel', {
                defaultMessage: 'PND',
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
                width: calc(${euiTheme.size.xxl} + ${euiTheme.size.m});
                justify-content: center;
              `}
            >
              <EuiIcon type="sun" size="l" aria-hidden={true} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              alignItems="flexStart"
              gutterSize="none"
              responsive={false}
              direction="column"
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {getPndGreeting()}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="l" css={{ fontWeight: 500 }}>
                  <h1>{title}</h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
      <EuiSpacer size="l" />
    </>
  );
};
