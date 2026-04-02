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
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import type { HuntingLead } from './types';
import { fromApiLead } from './types';
import * as i18n from './translations';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const getEntityIcon = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'user';
    case 'host':
      return 'desktop';
    case 'service':
      return 'gear';
    default:
      return 'questionInCircle';
  }
};

interface ThreatHuntingLeadsFlyoutProps {
  onClose: () => void;
  onSelectLead: (lead: HuntingLead) => void;
  onInfoClick?: (lead: HuntingLead) => void;
}

export const ThreatHuntingLeadsFlyout: React.FC<ThreatHuntingLeadsFlyoutProps> = ({
  onClose,
  onSelectLead,
  onInfoClick,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');

  const { fetchLeads } = useEntityAnalyticsRoutes();

  const { data, isLoading } = useQuery({
    queryKey: ['hunting-leads-flyout', pageIndex, pageSize],
    queryFn: ({ signal }) =>
      fetchLeads({
        signal,
        params: {
          page: pageIndex + 1,
          perPage: pageSize,
          sortField: 'priority',
          sortOrder: 'desc',
        },
      }),
  });

  const leads: HuntingLead[] = useMemo(() => data?.leads?.map(fromApiLead) ?? [], [data?.leads]);
  const totalCount = data?.total ?? 0;

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

  const handlePageChange = useCallback((page: number) => setPageIndex(page), []);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPageIndex(0);
  }, []);

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
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFieldSearch
          placeholder="Search leads..."
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
                  <LeadListItem lead={lead} onClick={onSelectLead} onInfoClick={onInfoClick} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>

            <EuiSpacer size="m" />
            <EuiTablePagination
              pageCount={Math.ceil((searchQuery ? filteredLeads.length : totalCount) / pageSize)}
              activePage={pageIndex}
              onChangePage={handlePageChange}
              itemsPerPage={pageSize}
              onChangeItemsPerPage={handlePageSizeChange}
              itemsPerPageOptions={PAGE_SIZE_OPTIONS}
              data-test-subj="leadsPagination"
            />
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};

interface LeadListItemProps {
  lead: HuntingLead;
  onClick: (lead: HuntingLead) => void;
  onInfoClick?: (lead: HuntingLead) => void;
}

const LeadListItem: React.FC<LeadListItemProps> = ({ lead, onClick, onInfoClick }) => {
  const handleClick = useCallback(() => onClick(lead), [onClick, lead]);
  const handleInfoClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onInfoClick?.(lead);
    },
    [onInfoClick, lead]
  );

  const relativeTime = useMemo(() => {
    const diff = Date.now() - new Date(lead.timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, [lead.timestamp]);

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      data-test-subj={`leadListItem-${lead.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{lead.title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {lead.byline}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            {lead.entities.slice(0, 2).map((entity) => (
              <EuiFlexItem grow={false} key={`${entity.type}-${entity.name}`}>
                <EuiBadge color="hollow">
                  <EuiIcon type={getEntityIcon(entity.type)} size="s" aria-hidden={true} />{' '}
                  {entity.name}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {relativeTime}
          </EuiText>
        </EuiFlexItem>
        {onInfoClick && (
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="iInCircle"
              aria-label={i18n.VIEW_LEAD_DETAILS}
              onClick={handleInfoClick}
              style={{ cursor: 'pointer' }}
              data-test-subj={`leadListInfoButton-${lead.id}`}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
