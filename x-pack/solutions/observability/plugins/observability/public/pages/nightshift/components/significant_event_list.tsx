/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SignificantEventItem } from './significant_event_item';

export interface SignificantEventListProps {
  title: string;
  events: SignificantEvent[];
  statusColor: 'danger' | 'success';
  onEventClick?: (event: SignificantEvent) => void;
  onChatClick?: (event: SignificantEvent) => void;
  sectionRef?: React.Ref<HTMLElement>;
}

export function SignificantEventList({
  title,
  events,
  statusColor,
  onEventClick,
  onChatClick,
  sectionRef,
}: SignificantEventListProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const roundedPanelCss = css`
    box-sizing: border-box;
    overflow: hidden;
    border-radius: ${euiTheme.size.s};
  `;
  const sectionCss = css`
    scroll-margin-top: ${euiTheme.size.base};
  `;

  const heading = (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={statusColor}>{events.length}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );

  if (events.length === 0) {
    return (
      <section ref={sectionRef} css={sectionCss}>
        {heading}
        <EuiPanel hasBorder hasShadow={false} paddingSize="l" color="subdued" css={roundedPanelCss}>
          <EuiText textAlign="center" color="subdued" size="s">
            <p>
              {i18n.translate('xpack.observability.nightshift.list.emptyDescription', {
                defaultMessage: 'No significant events found',
              })}
            </p>
          </EuiText>
        </EuiPanel>
      </section>
    );
  }

  return (
    <section ref={sectionRef} css={sectionCss}>
      {heading}
      <EuiPanel hasBorder hasShadow={false} paddingSize="none" css={roundedPanelCss}>
        <ol
          css={css`
            list-style: none;
            margin: 0;
            padding: 0;
          `}
        >
          {events.map((event, index) => (
            <li
              key={event.event_id}
              css={
                index < events.length - 1
                  ? css`
                      border-bottom: ${euiTheme.border.thin};
                    `
                  : undefined
              }
            >
              <SignificantEventItem
                event={event}
                onClick={onEventClick}
                onChatClick={onChatClick}
              />
            </li>
          ))}
        </ol>
      </EuiPanel>
    </section>
  );
}
