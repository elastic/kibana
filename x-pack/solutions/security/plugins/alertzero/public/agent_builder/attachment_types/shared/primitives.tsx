/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiPanel, EuiStat, EuiText } from '@elastic/eui';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

/**
 * Small, presentation-only building blocks shared by the attachment inline renderers
 * (threat, hunt correlation, significant security event). None of these carry enough
 * behavior to warrant their own test file; they are covered indirectly through the
 * renderer tests that use them.
 */

/**
 * Empty-state panel shared by the attachment inline renderers when the payload cannot be
 * parsed or resolved. `variant: 'text'` renders subdued body text; `variant: 'warning'` renders
 * an announced `KbnWarningCallout` (used by the threat renderer, whose empty state also needs
 * to survive a live-fetch failure, not just a parse failure).
 */
export const AttachmentEmptyState: React.FC<{
  testSubj: string;
  message: string;
  variant?: 'text' | 'warning';
  hasShadow?: boolean;
}> = ({ testSubj, message, variant = 'text', hasShadow = false }) => (
  <EuiPanel hasShadow={hasShadow} hasBorder={false} paddingSize="s" data-test-subj={testSubj}>
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
 * A group of hollow badges, one per item, shared by the tactics/regions/categories lists in the
 * threat renderer and the tactic-id column in the SSE tier-2 table. When `getHref` is provided
 * and returns a value for an item, that badge becomes a link (used for MITRE technique ids).
 */
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
 * `EuiStat` with the four props every call site in the attachment renderers repeats:
 * span title/description elements (no implicit heading levels), small title, left-aligned.
 */
export const CompactStat: React.FC<{ title: React.ReactNode; description: React.ReactNode }> = ({
  title,
  description,
}) => (
  <EuiStat
    titleElement="span"
    descriptionElement="span"
    titleSize="s"
    textAlign="left"
    title={title}
    description={description}
  />
);

/** `FormattedDate` + `FormattedTime` pair with the date format the SSE renderer repeats. */
export const DateTime: React.FC<{ value: string }> = ({ value }) => (
  <>
    <FormattedDate value={value} year="numeric" month="short" day="2-digit" />{' '}
    <FormattedTime value={value} />
  </>
);

/**
 * Small bold section heading shared by the attachment inline renderers. `suffix` renders
 * inline after the heading text (e.g. a threshold tooltip) inside the same text block.
 */
export const SectionHeading: React.FC<{ children: React.ReactNode; suffix?: React.ReactNode }> = ({
  children,
  suffix,
}) => (
  <EuiText size="s">
    <strong>{children}</strong>
    {suffix ? <> {suffix}</> : null}
  </EuiText>
);

/**
 * Public MITRE ATT&CK technique reference URL. There is no importable
 * component that maps a technique id to a name (the lookup table lives in
 * `@kbn/security-solution-plugin/common` and is ~290 KB); technique badges
 * stay id-only with this external link instead.
 */
export const buildMitreTechniqueUrl = (techniqueId: string): string =>
  `https://attack.mitre.org/techniques/${techniqueId.replace('.', '/')}/`;
