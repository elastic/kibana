/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiNotificationBadge,
  EuiPanel,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQuery } from '@kbn/react-query';
import { getLeadsIndexName } from '../../../../../common/entity_analytics/lead_generation/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import type { HuntingLead } from './types';
import { fromApiLead } from './types';
import { GeneratedOnLabel } from './generated_on_label';
import * as i18n from './translations';
import { renderTextWithEntities } from './shared_lead_components';
import { MAX_RECENT_LEADS, THREAT_HUNTING_LEADS_SCOPE_ID } from './utils';

interface ThreatHuntingLeadsFlyoutProps {
  onClose: () => void;
  onSelectLead: (lead: HuntingLead) => void;
  lastRunTimestamp?: string | null;
}

export const ThreatHuntingLeadsFlyout: React.FC<ThreatHuntingLeadsFlyoutProps> = ({
  onClose,
  onSelectLead,
  lastRunTimestamp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { fetchLeads } = useEntityAnalyticsRoutes();
  const { share } = useKibana().services;
  const spaceId = useSpaceId();

  const handleViewLeadsArchiveIndex = useCallback(async () => {
    const discoverLocator = share?.url.locators.get('DISCOVER_APP_LOCATOR');
    if (!discoverLocator || !spaceId) return;

    // Scope the data view to this space's leads indices only. The underlying indices are
    // per-space (see getLeadsIndexName), so a `-*` wildcard would span every space's leads
    // and is only guarded by raw ES index privileges, not Kibana space isolation.
    const spaceLeadsIndexPattern = [
      getLeadsIndexName(spaceId, 'adhoc'),
      getLeadsIndexName(spaceId, 'scheduled'),
    ].join(',');

    const url = await discoverLocator.getRedirectUrl({
      dataViewSpec: {
        id: `entity-analytics-threat-hunting-leads-archive-${spaceId}`,
        title: spaceLeadsIndexPattern,
        allowHidden: true,
      },
    });

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [share, spaceId]);

  const { data, isLoading } = useQuery({
    queryKey: ['hunting-leads-flyout'],
    queryFn: ({ signal }) =>
      fetchLeads({
        signal,
        params: {
          page: 1,
          perPage: MAX_RECENT_LEADS,
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
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{i18n.ALL_HUNTING_LEADS_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {!isLoading && leads.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued" size="m" data-test-subj="leadsCountBadge">
                {leads.length}
              </EuiNotificationBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.ALL_HUNTING_LEADS_DESCRIPTION}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          {lastRunTimestamp && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="leadsFlyoutGeneratedTimestamp">
                <GeneratedOnLabel timestamp={lastRunTimestamp} />
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="external"
              flush="left"
              iconSide="right"
              onClick={handleViewLeadsArchiveIndex}
              isDisabled={!spaceId}
              data-test-subj="viewLeadsArchiveIndexButton"
            >
              {i18n.VIEW_LEADS_ARCHIVE_INDEX}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
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
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            data-test-subj="leadsFlyoutLoadingSkeleton"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <EuiFlexItem key={index}>
                <EuiPanel hasBorder paddingSize="s">
                  <EuiSkeletonTitle size="xs" />
                  <EuiSpacer size="s" />
                  <EuiSkeletonText lines={2} size="s" />
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : filteredLeads.length === 0 ? (
          <EuiPanel color="subdued" data-test-subj="noMatchingLeads">
            <EuiText size="s" color="subdued" textAlign="center">
              {i18n.NO_MATCHING_LEADS}
            </EuiText>
          </EuiPanel>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s">
            {filteredLeads.map((lead) => (
              <EuiFlexItem key={lead.id}>
                <LeadListItem lead={lead} onClick={onSelectLead} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
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
  const { euiTheme } = useEuiTheme();
  const fontSizeM = useEuiFontSize('m');
  const handleClick = useCallback(() => onClick(lead), [onClick, lead]);
  const renderedByline = useMemo(
    () => renderTextWithEntities(lead.byline, lead.entities, THREAT_HUNTING_LEADS_SCOPE_ID),
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
            <EuiFlexItem style={{ minWidth: 0 }}>
              <h4
                css={css`
                  ${fontSizeM}
                  font-weight: ${euiTheme.font.weight.semiBold};
                  overflow: hidden;
                  text-overflow: ellipsis;
                  display: -webkit-box;
                  -webkit-line-clamp: 1;
                  -webkit-box-orient: vertical;
                `}
              >
                <EuiToolTip content={lead.title} anchorClassName="eui-textTruncate" display="block">
                  <span tabIndex={0}>{lead.title}</span>
                </EuiToolTip>
              </h4>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText size="xs">{renderedByline}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
