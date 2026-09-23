/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

/**
 * Shared visual primitives for the Hunt Watch attachment cards.
 *
 * Every attachment body is composed from the same handful of pieces so the three cards read
 * as one family: a `Section` (small title, optional aside, consistent gap), a `KeyValueList`
 * (subdued label column + wrapping badge values), a compact `StatRow`, and small badge lists.
 */

export const AttachmentEmptyState: React.FC<{
  testSubj: string;
  message: string;
  variant?: 'text' | 'warning';
  hasShadow?: boolean;
}> = ({ testSubj, message, variant = 'text', hasShadow = false }) => (
  <EuiPanel hasShadow={hasShadow} hasBorder={false} paddingSize="m" data-test-subj={testSubj}>
    {variant === 'warning' ? (
      <KbnWarningCallout announceOnMount size="s" title={message} />
    ) : (
      <EuiText size="s" color="subdued">
        {message}
      </EuiText>
    )}
  </EuiPanel>
);

/**
 * Section title row. `aside` renders right-aligned (counts, status badges, threshold tips),
 * `suffix` renders inline right after the title text (icon tips).
 */
export const SectionHeading: React.FC<{
  children: React.ReactNode;
  suffix?: React.ReactNode;
  aside?: React.ReactNode;
  testSubj?: string;
}> = ({ children, suffix, aside, testSubj }) => (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="center"
    justifyContent="spaceBetween"
    responsive={false}
    wrap
    data-test-subj={testSubj}
  >
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{children}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {suffix ? <EuiFlexItem grow={false}>{suffix}</EuiFlexItem> : null}
      </EuiFlexGroup>
    </EuiFlexItem>
    {aside ? <EuiFlexItem grow={false}>{aside}</EuiFlexItem> : null}
  </EuiFlexGroup>
);

/** A titled block with the standard heading-to-content gap. */
export const Section: React.FC<{
  title: React.ReactNode;
  suffix?: React.ReactNode;
  aside?: React.ReactNode;
  testSubj?: string;
  children: React.ReactNode;
}> = ({ title, suffix, aside, testSubj, children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div data-test-subj={testSubj} css={{ minWidth: 0 }}>
      <SectionHeading suffix={suffix} aside={aside}>
        {title}
      </SectionHeading>
      <div css={{ marginTop: euiTheme.size.s }}>{children}</div>
    </div>
  );
};

/** Vertical stack of sections with one consistent gap between them. */
export const SectionStack: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      {items.map((child, index) => (
        <EuiFlexItem
          grow={false}
          key={index}
          css={{ minWidth: 0, marginTop: index > 0 ? euiTheme.size.l : 0 }}
        >
          {child}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

/** Bordered mini card: subdued label on top, value (badge, text) below. Used in card grids. */
export const MetaCard: React.FC<{
  label: React.ReactNode;
  children: React.ReactNode;
  testSubj?: string;
}> = ({ label, children, testSubj }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      css={css`
        height: 100%;
        min-width: 0;
      `}
      data-test-subj={testSubj}
    >
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      <div css={{ marginTop: euiTheme.size.s, minWidth: 0 }}>{children}</div>
    </EuiPanel>
  );
};

/**
 * Bordered rounded frame for tables inside a card: horizontal inset from the border, small row
 * text, and no divider under the last row (the frame already closes the table).
 */
export const TableFrame: React.FC<{ children: React.ReactNode; testSubj?: string }> = ({
  children,
  testSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="none"
      css={css`
        overflow: hidden;
        min-width: 0;
        padding: ${euiTheme.size.xs} ${euiTheme.size.m};
        font-size: ${fontSize};

        tbody tr:last-of-type,
        tbody tr:last-of-type > td {
          border-block-end: none;
        }
      `}
      data-test-subj={testSubj}
    >
      {children}
    </EuiPanel>
  );
};

/** Small subdued label used for inline key/value pairs (`Run id`, `Source report`). */
export const InlineLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="xs" color="subdued" css={{ whiteSpace: 'nowrap' }}>
    {children}
  </EuiText>
);

/** Expands `<>…</>` wrappers so each badge becomes its own flex item and wraps independently. */
const flattenChildren = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).flatMap((child) =>
    React.isValidElement(child) && child.type === React.Fragment
      ? flattenChildren((child.props as { children?: React.ReactNode }).children)
      : [child]
  );

/** Wrapping row of compact badges. */
export const BadgeRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiFlexGroup
    gutterSize="xs"
    alignItems="center"
    responsive={false}
    wrap
    css={{ minWidth: 0, maxWidth: '100%' }}
  >
    {flattenChildren(children).map((child, index) =>
      child ? (
        <EuiFlexItem grow={false} key={index} css={{ minWidth: 0, maxWidth: '100%' }}>
          {child}
        </EuiFlexItem>
      ) : null
    )}
  </EuiFlexGroup>
);

export const HollowBadgeList: React.FC<{
  items: string[];
  getHref?: (item: string) => string | undefined;
}> = ({ items, getHref }) => (
  <EuiBadgeGroup gutterSize="xs">
    {items.map((item) => {
      const href = getHref?.(item);
      return href ? (
        <EuiBadge
          key={item}
          color="hollow"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          iconType="external"
          iconSide="right"
        >
          {item}
        </EuiBadge>
      ) : (
        <EuiBadge key={item} color="hollow">
          {item}
        </EuiBadge>
      );
    })}
  </EuiBadgeGroup>
);

/**
 * Compact stat: subdued label on top, value below. Sized for dense analyst cards rather than
 * dashboard KPIs (the value is body-size bold, not display-size).
 */
export const CompactStat: React.FC<{
  title: React.ReactNode;
  description: React.ReactNode;
  emphasis?: 'default' | 'strong';
}> = ({ title, description, emphasis = 'default' }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div>
      <EuiText size="xs" color="subdued" css={{ whiteSpace: 'nowrap' }}>
        {description}
      </EuiText>
      <EuiText
        size={emphasis === 'strong' ? 'm' : 's'}
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
          overflow-wrap: anywhere;
        `}
      >
        {title}
      </EuiText>
    </div>
  );
};

/** Horizontal row of `CompactStat`s with a consistent gap. */
export const StatRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiFlexGroup gutterSize="xl" responsive={false} wrap>
    {React.Children.map(children, (child, index) =>
      child ? (
        <EuiFlexItem grow={false} key={index}>
          {child}
        </EuiFlexItem>
      ) : null
    )}
  </EuiFlexGroup>
);

export const DateTime: React.FC<{ value: string }> = ({ value }) => (
  <>
    <FormattedDate value={value} year="numeric" month="short" day="2-digit" />{' '}
    <FormattedTime value={value} />
  </>
);

/** Two-line clamp with tooltip-friendly overflow, for summaries inside tight cells. */
export const clampTwoLines = css`
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const buildMitreTechniqueUrl = (techniqueId: string): string =>
  `https://attack.mitre.org/techniques/${techniqueId.replace('.', '/')}/`;
