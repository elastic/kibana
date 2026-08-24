/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutBody, EuiText, EuiTitle } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { DetailsBlock } from './detail_block';
import { DETAILS_FLYOUT_LABELS as i18n } from './translations';
import { CriticalityBadge } from './criticality_badge';
import { TimelineEventList } from '../timeline';

export interface ConversationDetailsFlyoutBodyProps {
  investigation: Investigation;
}

export const ConversationDetailsFlyoutBody = memo<ConversationDetailsFlyoutBodyProps>(
  ({ investigation: { title, summary, events, priorityScore } }) => {
    return (
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              {title && (
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>{title}</h2>
                  </EuiTitle>
                </EuiFlexItem>
              )}

              {priorityScore && (
                <EuiFlexItem>
                  <CriticalityBadge priorityScore={priorityScore} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          {summary && (
            <DetailsBlock title={i18n.sections.overview}>
              <EuiText size="s" color="subdued">
                <p>{summary}</p>
              </EuiText>
            </DetailsBlock>
          )}

          {events.length > 0 && (
            <>
              <EuiFlexItem>
                <EuiFlexGroup
                  direction="row"
                  gutterSize="s"
                  alignItems="center"
                  justifyContent="flexStart"
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>{i18n.sections.timeline}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      <span>{events.length}</span>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <TimelineEventList events={events} />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    );
  }
);

ConversationDetailsFlyoutBody.displayName = 'ConversationDetailsFlyoutBody';
