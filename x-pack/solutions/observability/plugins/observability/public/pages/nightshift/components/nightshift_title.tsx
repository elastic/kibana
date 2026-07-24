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
import { i18n } from '@kbn/i18n';

export interface NightshiftTitleProps {
  isLoading?: boolean;
  hasNeedsAction?: boolean;
  showAllEventsHref?: string;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return i18n.translate('xpack.observability.nightshift.hero.morningGreetingDescription', {
      defaultMessage: 'Good morning!',
    });
  }

  if (hour < 18) {
    return i18n.translate('xpack.observability.nightshift.hero.afternoonGreetingDescription', {
      defaultMessage: 'Good afternoon!',
    });
  }

  return i18n.translate('xpack.observability.nightshift.hero.eveningGreetingDescription', {
    defaultMessage: 'Good evening!',
  });
};

const getHeroTitle = ({
  isLoading,
  hasNeedsAction,
}: {
  isLoading: boolean;
  hasNeedsAction: boolean;
}): string => {
  if (isLoading) {
    return i18n.translate('xpack.observability.nightshift.hero.checkingTitle', {
      defaultMessage: 'Running a quick check',
    });
  }

  if (hasNeedsAction) {
    return i18n.translate('xpack.observability.nightshift.hero.needsActionTitle', {
      defaultMessage: 'Some significant events need action',
    });
  }

  return i18n.translate('xpack.observability.nightshift.hero.allClearTitle', {
    defaultMessage: "You're all caught up",
  });
};

function NightshiftHeroIcon({ ariaLabel }: { ariaLabel: string }) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      aria-label={ariaLabel}
      role="img"
      css={css`
        align-items: center;
        background: linear-gradient(
          99.4deg,
          ${euiTheme.colors.backgroundLightPrimary} 3.97%,
          ${euiTheme.colors.backgroundLightAccent} 65.6%
        );
        border-radius: 50%;
        color: ${euiTheme.colors.textAccent};
        display: inline-flex;
        height: calc(${euiTheme.size.xxl} + ${euiTheme.size.m});
        justify-content: center;
        width: calc(${euiTheme.size.xxl} + ${euiTheme.size.m});
      `}
    >
      <svg aria-hidden={true} width="20" height="19" viewBox="0 0 20 19" fill="none">
        <path
          d="M19.4936 6.75C19.4936 6.94891 19.4146 7.13968 19.2739 7.28033C19.1333 7.42098 18.9425 7.5 18.7436 7.5H17.2436V9C17.2436 9.19891 17.1646 9.38968 17.0239 9.53033C16.8833 9.67098 16.6925 9.75 16.4936 9.75C16.2947 9.75 16.1039 9.67098 15.9633 9.53033C15.8226 9.38968 15.7436 9.19891 15.7436 9V7.5H14.2436C14.0447 7.5 13.8539 7.42098 13.7133 7.28033C13.5726 7.13968 13.4936 6.94891 13.4936 6.75C13.4936 6.55109 13.5726 6.36032 13.7133 6.21967C13.8539 6.07902 14.0447 6 14.2436 6H15.7436V4.5C15.7436 4.30109 15.8226 4.11032 15.9633 3.96967C16.1039 3.82902 16.2947 3.75 16.4936 3.75C16.6925 3.75 16.8833 3.82902 17.0239 3.96967C17.1646 4.11032 17.2436 4.30109 17.2436 4.5V6H18.7436C18.9425 6 19.1333 6.07902 19.2739 6.21967C19.4146 6.36032 19.4936 6.55109 19.4936 6.75ZM10.4936 3H11.2436V3.75C11.2436 3.94891 11.3226 4.13968 11.4633 4.28033C11.6039 4.42098 11.7947 4.5 11.9936 4.5C12.1925 4.5 12.3833 4.42098 12.5239 4.28033C12.6646 4.13968 12.7436 3.94891 12.7436 3.75V3H13.4936C13.6925 3 13.8833 2.92098 14.0239 2.78033C14.1646 2.63968 14.2436 2.44891 14.2436 2.25C14.2436 2.05109 14.1646 1.86032 14.0239 1.71967C13.8833 1.57902 13.6925 1.5 13.4936 1.5H12.7436V0.75C12.7436 0.551088 12.6646 0.360322 12.5239 0.21967C12.3833 0.0790176 12.1925 0 11.9936 0C11.7947 0 11.6039 0.0790176 11.4633 0.21967C11.3226 0.360322 11.2436 0.551088 11.2436 0.75V1.5H10.4936C10.2947 1.5 10.1039 1.57902 9.96327 1.71967C9.82262 1.86032 9.7436 2.05109 9.7436 2.25C9.7436 2.44891 9.82262 2.63968 9.96327 2.78033C10.1039 2.92098 10.2947 3 10.4936 3ZM17.3158 12.0938C17.4031 12.1954 17.4616 12.3186 17.4851 12.4505C17.5087 12.5824 17.4965 12.7182 17.4499 12.8438C16.9294 14.263 16.0599 15.5284 14.9215 16.523C13.7831 17.5176 12.4125 18.2094 10.9362 18.5346C9.45991 18.8598 7.92549 18.808 6.47453 18.3838C5.02358 17.9596 3.70285 17.1767 2.63423 16.1075C1.56561 15.0383 0.783528 13.7171 0.360162 12.2659C-0.0632036 10.8147 -0.114213 9.28027 0.211841 7.80416C0.537895 6.32806 1.23051 4.95786 2.22576 3.82002C3.22101 2.68218 4.48684 1.81337 5.90641 1.29375C6.03136 1.24799 6.16623 1.2363 6.29719 1.25987C6.42815 1.28344 6.55048 1.34142 6.65163 1.42788C6.75278 1.51434 6.82911 1.62614 6.87279 1.75184C6.91646 1.87753 6.92591 2.01258 6.90016 2.14313C6.63734 3.47341 6.7062 4.84795 7.10066 6.1453C7.49512 7.44266 8.20304 8.62289 9.16188 9.58172C10.1207 10.5406 11.3009 11.2485 12.5983 11.6429C13.8957 12.0374 15.2702 12.1063 16.6005 11.8434C16.7312 11.8179 16.8664 11.8276 16.9921 11.8716C17.1178 11.9156 17.2295 11.9923 17.3158 12.0938ZM15.498 13.4888C15.3302 13.4972 15.1614 13.5019 14.9936 13.5019C12.4083 13.4991 9.92961 12.4708 8.10166 10.6425C6.27372 8.81419 5.24583 6.33535 5.2436 3.75C5.2436 3.58219 5.2436 3.41344 5.25673 3.24562C4.25884 3.81985 3.40654 4.61611 2.76588 5.57271C2.12522 6.5293 1.71338 7.62055 1.56229 8.76191C1.4112 9.90326 1.5249 11.0641 1.89459 12.1544C2.26427 13.2448 2.88002 14.2354 3.69412 15.0495C4.50822 15.8636 5.49882 16.4793 6.58917 16.849C7.67952 17.2187 8.84034 17.3324 9.98169 17.1813C11.123 17.0302 12.2143 16.6184 13.1709 15.9777C14.1275 15.3371 14.9237 14.4848 15.498 13.4869V13.4888Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export function NightshiftTitle({
  isLoading = false,
  hasNeedsAction = false,
  showAllEventsHref,
}: NightshiftTitleProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  const title = getHeroTitle({ isLoading, hasNeedsAction });

  return (
    <EuiFlexItem
      css={css`
        padding: ${euiTheme.size.m} 0;
      `}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <NightshiftHeroIcon
                ariaLabel={i18n.translate(
                  'xpack.observability.nightshift.hero.nightshiftIconAriaLabel',
                  {
                    defaultMessage: 'Nightshift',
                  }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                <p>{getGreeting()}</p>
              </EuiText>
              <EuiTitle
                size="m"
                css={css`
                  font-size: calc(${euiTheme.size.l} + ${euiTheme.size.xxs});
                  font-weight: ${euiTheme.font.weight.medium};
                  line-height: ${euiTheme.size.xl};
                  white-space: nowrap;
                `}
              >
                <h1>{title}</h1>
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
              iconSide="right"
              iconType="arrowRight"
              size="s"
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              {i18n.translate('xpack.observability.nightshift.summary.showAllEventsLinkText', {
                defaultMessage: 'Show all events',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
