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
      defaultMessage: 'No actions need you',
    });
  }

  if (hasNeedsAction) {
    // "action", not "event": the queue counts pending actions, and several can share one thread, so
    // the event wording also over-counted (design decisions 2026-08-11 and 2026-08-12 — user-facing
    // copy says "action(s)"). The message id keeps its bytes; only the copy changed.
    return i18n.translate('xpack.pnd.hero.needsActionTitle', {
      defaultMessage: '{eventCount, plural, one {# action needs you} other {# actions need you}}',
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
  /**
   * Drawn at the trailing edge of the **hero**, opposite the headline. The queue passes
   * `DemoModeBadge` here, which renders nothing unless `xpack.pnd.demo.forceIncident` is on — so a
   * run that skipped the assessment can never present its verdict as a real one.
   *
   * Absent leaves the hero rendering exactly as it did before the prop existed: the trailing flex
   * item is not emitted at all, rather than emitted empty.
   */
  badge?: React.ReactNode;
  isQueueEmpty?: boolean;
  isLoading?: boolean;
  eventCount?: number;
  /**
   * Renders the plain titled header instead of the queue hero. Absent on the hero's own call site,
   * which derives its headline from the queue counts above.
   */
  title?: React.ReactNode;
  /** Only read alongside `title`; the hero has a greeting where this would sit. */
  subtitle?: React.ReactNode;
}

/**
 * The plain titled header, for the routes that name themselves rather than counting a queue.
 *
 * This is what `PndPageHeader` was before
 * [#284440](https://github.com/elastic/kibana/pull/284440) turned it into the queue hero. It is
 * kept here, behind the same exported name, because that PR's only caller is the queue: the
 * repurposing left Chats, Executions and Settings — pages upstream does not have — with no header
 * at all. Widening additively rather than forking a second component is epic decision 9, and it
 * keeps upstream's call site rendering byte-identically.
 */
const PndTitledHeader: React.FC<Pick<PndPageHeaderProps, 'subtitle' | 'title'>> = ({
  subtitle,
  title,
}) => (
  <>
    <EuiPageHeader alignItems="center" bottomBorder={false} data-test-subj="pndPageHeader">
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="l"
        responsive={false}
        wrap
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>{title}</h1>
          </EuiTitle>
          {subtitle ? (
            <>
              <EuiSpacer size="xs" />
              <EuiText color="subdued" size="s">
                {typeof subtitle === 'string' ? <p>{subtitle}</p> : subtitle}
              </EuiText>
            </>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageHeader>
    <EuiSpacer size="l" />
  </>
);

/**
 * Page header for PND routes: the queue hero by default, the titled header when given a `title`.
 *
 * Important: keep everything in `EuiPageHeader` children and do **not** pass
 * `rightSideItems` into EUI. When `rightSideItems` is set, EUI leaves the
 * children-only path and prepends an `EuiSpacer` before custom children —
 * which pushes Watches (and any page with actions) down vs placeholders.
 */
export const PndPageHeader: React.FC<PndPageHeaderProps> = ({
  badge,
  isQueueEmpty = false,
  isLoading = false,
  eventCount = 0,
  subtitle,
  title: titleProp,
}) => {
  const { euiTheme } = useEuiTheme();
  const title = getPndHeroTitle({
    isQueueEmpty,
    isLoading,
    hasNeedsAction: eventCount > 0,
    eventCount,
  });

  if (titleProp != null) {
    return <PndTitledHeader subtitle={subtitle} title={titleProp} />;
  }

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
                defaultMessage: 'AlertZero',
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
          {badge != null && (
            <EuiFlexItem
              css={css`
                margin-inline-start: auto;
              `}
              data-test-subj="pndPageHeaderBadge"
              grow={false}
            >
              {badge}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPageHeader>
      <EuiSpacer size="l" />
    </>
  );
};
