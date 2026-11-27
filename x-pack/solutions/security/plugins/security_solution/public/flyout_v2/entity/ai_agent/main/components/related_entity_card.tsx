/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type IconType,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DescriptionList } from '../../../../../../common/utility_types';
import { DescriptionListStyled } from '../../../../../common/components/page';
import { AI_AGENT_TEST_IDS } from '../test_ids';

export interface RelatedEntityCardProps {
  /** How the entity relates to the agent, shown above the name ("Signed in as", "Host"). */
  readonly caption: string;
  readonly iconType: IconType;
  /** An entity link, or plain text when the entity has no flyout. */
  readonly name: React.ReactNode;
  readonly subtitle?: string;
  /** Labelled values, two to a row, as in the alert flyout's entity blocks. */
  readonly items?: readonly DescriptionList[];
  /** Facts that need action now, shown as one line after a single danger icon. */
  readonly status?: readonly string[];
  /** Extra rows, such as the shared alert count bar, which renders its own flex item. */
  readonly children?: React.ReactNode;
  readonly 'data-test-subj'?: string;
}

/**
 * One entity related to the agent, built from the same pieces as the entity blocks in the alert
 * flyout's Insights: an icon and bold name, labelled values and an optional alert bar. On top of
 * those it adds the relationship caption, a linked name and one status line.
 */
export const RelatedEntityCard = memo(
  ({
    caption,
    iconType,
    name,
    subtitle,
    items = [],
    status = [],
    children,
    'data-test-subj': dataTestSubj,
  }: RelatedEntityCardProps) => (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          {caption}
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              min-width: 0;
            `}
          >
            <EuiTitle size="xxs">
              <h4>{name}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        {subtitle && (
          <EuiText
            size="xs"
            color="subdued"
            css={({ euiTheme }: UseEuiTheme) => css`
              padding-inline-start: ${euiTheme.size.l};
            `}
          >
            {subtitle}
          </EuiText>
        )}
      </EuiFlexItem>
      {items.length > 0 && (
        <EuiFlexItem>
          <EuiFlexGrid columns={2} gutterSize="s">
            {items.map((item, index) => (
              <EuiFlexItem key={index}>
                <DescriptionListStyled listItems={[item]} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiFlexItem>
      )}
      {status.length > 0 && (
        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="flexStart"
            responsive={false}
            data-test-subj={AI_AGENT_TEST_IDS.entityStatus}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="warning" color="danger" size="s" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">{status.join(' · ')}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      {children}
    </EuiFlexGroup>
  )
);
RelatedEntityCard.displayName = 'RelatedEntityCard';
