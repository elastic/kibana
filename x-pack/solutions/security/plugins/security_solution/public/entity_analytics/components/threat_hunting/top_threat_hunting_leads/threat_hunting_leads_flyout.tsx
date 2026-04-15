/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import type { HuntingLead } from './types';
import { fromApiLead } from './types';
import * as i18n from './translations';
import { MAX_VISIBLE_TAGS } from './utils';
import { renderTextWithEntities, TagsPopover } from './shared_lead_components';

interface ThreatHuntingLeadsFlyoutProps {
  onClose: () => void;
  onSelectLead: (lead: HuntingLead) => void;
}

export const ThreatHuntingLeadsFlyout: React.FC<ThreatHuntingLeadsFlyoutProps> = ({
  onClose,
  onSelectLead,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { fetchLeads } = useEntityAnalyticsRoutes();

  const { data, isLoading } = useQuery({
    queryKey: ['hunting-leads-flyout'],
    queryFn: ({ signal }) =>
      fetchLeads({
        signal,
        params: {
          page: 1,
          perPage: 10,
          sortField: 'priority',
          sortOrder: 'desc',
        },
      }),
  });

  const leads: HuntingLead[] = useMemo(() => data?.leads?.map(fromApiLead) ?? [], [data?.leads]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.title.toLowerCase().includes(query) ||
        lead.byline.toLowerCase().includes(query) ||
        lead.entities.some((e) => e.name.toLowerCase().includes(query))
    );
  }, [leads, searchQuery]);

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      size="m"
      ownFocus
      aria-label={i18n.ALL_HUNTING_LEADS_TITLE}
      data-test-subj="threatHuntingLeadsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.ALL_HUNTING_LEADS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.ALL_HUNTING_LEADS_DESCRIPTION}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFieldSearch
          placeholder={i18n.SEARCH_LEADS_PLACEHOLDER}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          data-test-subj="leadSearchField"
        />
        <EuiSpacer size="m" />

        {isLoading ? (
          <EuiText textAlign="center" color="subdued">
            {i18n.LOADING}
          </EuiText>
        ) : (
          <>
            <EuiFlexGroup direction="column" gutterSize="s">
              {filteredLeads.map((lead) => (
                <EuiFlexItem key={lead.id}>
                  <LeadListItem lead={lead} onClick={onSelectLead} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};

interface LeadListItemProps {
  lead: HuntingLead;
  onClick: (lead: HuntingLead) => void;
}

const LeadListItem: React.FC<LeadListItemProps> = ({ lead, onClick }) => {
  const handleClick = useCallback(() => onClick(lead), [onClick, lead]);
  const renderedByline = useMemo(
    () => renderTextWithEntities(lead.byline, lead.entities),
    [lead.byline, lead.entities]
  );
  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      onClick={handleClick}
      data-test-subj={`leadListItem-${lead.id}`}
    >
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{lead.title}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {renderedByline}
          </EuiText>
        </EuiFlexItem>

        {lead.tags.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
              {lead.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
              {lead.tags.length > MAX_VISIBLE_TAGS && (
                <EuiFlexItem grow={false}>
                  <TagsPopover tags={lead.tags} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
