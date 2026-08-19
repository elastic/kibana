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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../common/ebt_constants';
import { SignificantEventItem } from './significant_event_item';

export interface SignificantEventListProps {
  title: string;
  events: SignificantEvent[];
  selectedEventUuid?: string;
  statusColor: 'danger' | 'success';
  filterActive?: boolean;
  onClearFilter?: () => void;
  onEventClick?: (event: SignificantEvent) => void;
  onChatClick?: (event: SignificantEvent) => void;
  onCloseClick?: (event: SignificantEvent) => void;
  closingEventUuid?: string;
  sectionRef?: React.Ref<HTMLElement>;
}

export function SignificantEventList({
  title,
  events,
  selectedEventUuid,
  statusColor,
  filterActive = false,
  onClearFilter,
  onEventClick,
  onChatClick,
  onCloseClick,
  closingEventUuid,
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
          <EuiTitle
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
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
              {filterActive
                ? statusColor === 'success'
                  ? i18n.translate('xpack.nightshift.list.filteredResolvedEmptyDescription', {
                      defaultMessage: 'No resolved events match this filter.',
                    })
                  : i18n.translate('xpack.nightshift.list.filteredEmptyDescription', {
                      defaultMessage: 'No events match this filter.',
                    })
                : i18n.translate('xpack.nightshift.list.emptyDescription', {
                    defaultMessage: 'No significant events found',
                  })}
            </p>
          </EuiText>
          {filterActive && onClearFilter && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup justifyContent="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="nightshiftClearBlastRadiusFilterButton"
                    flush="left"
                    onClick={onClearFilter}
                    size="s"
                    {...getEbtProps({
                      action: NIGHTSHIFT_EBT_ACTIONS.CLEAR_BLAST_RADIUS_FILTER,
                      element: NIGHTSHIFT_EBT_ELEMENTS.SIGNIFICANT_EVENTS_LIST,
                      detail:
                        statusColor === 'danger'
                          ? NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION
                          : NIGHTSHIFT_EBT_DETAILS.RESOLVED,
                    })}
                  >
                    {i18n.translate('xpack.nightshift.list.clearFilterButton', {
                      defaultMessage: 'Clear filter',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
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
              key={event.event_uuid}
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
                isSelected={event.event_uuid === selectedEventUuid}
                onClick={onEventClick}
                onChatClick={onChatClick}
                onCloseClick={onCloseClick}
                isClosing={event.event_uuid === closingEventUuid}
              />
            </li>
          ))}
        </ol>
      </EuiPanel>
    </section>
  );
}
