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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcTicketByRepoGroup } from '../../../../common/api/types';
import { getTicketStatusLabel } from '../lib/coverage_utils';

const getTicketStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  if (status === 'closed') {
    return 'success';
  }
  if (status === 'in-progress') {
    return 'warning';
  }
  return 'default';
};

export const TicketsView = ({
  ticketsByRepo,
}: {
  ticketsByRepo: readonly SdlcTicketByRepoGroup[];
}) => {
  const { euiTheme } = useEuiTheme();

  if (ticketsByRepo.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.sdlcIntel.executive.tickets.empty"
          defaultMessage="No linked tickets yet."
        />
      </EuiText>
    );
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
      `}
    >
      {ticketsByRepo.map((repoGroup) => {
        const closedCount = repoGroup.items.filter((item) => item.status === 'closed').length;
        const activeCount = repoGroup.items.filter((item) => item.status === 'in-progress').length;
        const openCount = repoGroup.items.filter((item) => item.status === 'open').length;

        return (
          <div key={repoGroup.repo}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoGithub" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{repoGroup.repo}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.sdlcIntel.executive.tickets.repoCounts"
                    defaultMessage="{count, plural, one {# ticket} other {# tickets}}{closed, plural, =0 {} other { · # closed}}{active, plural, =0 {} other { · # active}}{open, plural, =0 {} other { · # open}}"
                    values={{
                      count: repoGroup.items.length,
                      closed: closedCount,
                      active: activeCount,
                      open: openCount,
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${euiTheme.size.xs};
                margin-top: ${euiTheme.size.s};
              `}
            >
              {repoGroup.items.map((ticket) => (
                <EuiPanel
                  key={`${repoGroup.repo}-${ticket.issueRef}`}
                  hasBorder
                  paddingSize="s"
                  color="transparent"
                >
                  <EuiFlexGroup direction="column" gutterSize="xs">
                    <EuiFlexItem>
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiText size="s">
                            <code>{ticket.issueRef}</code>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s">{ticket.title}</EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                        {ticket.prRefs.length > 0 ? (
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs" color="primary">
                              <code>{ticket.prRefs.join(', ')}</code>
                            </EuiText>
                          </EuiFlexItem>
                        ) : (
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs" color="subdued" style={{ fontStyle: 'italic' }}>
                              <FormattedMessage
                                id="xpack.sdlcIntel.executive.tickets.noPr"
                                defaultMessage="No PR linked"
                              />
                            </EuiText>
                          </EuiFlexItem>
                        )}
                        <EuiFlexItem grow={false}>
                          <EuiBadge color={getTicketStatusColor(ticket.status)}>
                            {getTicketStatusLabel(ticket.status)}
                          </EuiBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
