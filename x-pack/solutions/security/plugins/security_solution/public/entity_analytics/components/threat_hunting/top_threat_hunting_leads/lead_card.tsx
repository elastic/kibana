/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import type { HuntingLead } from './types';
import { renderTextWithEntity } from './shared_lead_components';
import { THREAT_HUNTING_LEADS_SCOPE_ID } from './utils';
import * as i18n from './translations';

interface LeadCardProps {
  lead: HuntingLead;
  onClick: (lead: HuntingLead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {
  const handleClick = useCallback(() => onClick(lead), [onClick, lead]);
  const renderedByline = useMemo(
    () => renderTextWithEntity(lead.byline, lead.entity, THREAT_HUNTING_LEADS_SCOPE_ID),
    [lead.byline, lead.entity]
  );

  return (
    <EuiCard
      title={
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={1} css={{ minWidth: 0 }}>
            <EuiToolTip content={lead.title} anchorClassName="eui-textTruncate" display="block">
              <span tabIndex={0}>{lead.title}</span>
            </EuiToolTip>
          </EuiFlexItem>
          {lead.origin === 'exploratory' && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.EXPLORATORY_ICON_TOOLTIP}>
                <span tabIndex={0} data-test-subj="leadExploratoryBadge">
                  <AiIcon iconType="sparkles" size="s" aria-label={i18n.EXPLORATORY_BADGE_LABEL} />
                </span>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      titleElement="h5"
      titleSize="xs"
      textAlign="left"
      hasBorder={false}
      paddingSize="m"
      onClick={handleClick}
      data-test-subj={`leadCard-${lead.id}`}
      css={{
        minWidth: 0,
        maxWidth: 480,
        '.euiCard__titleButton': { maxWidth: '100%' },
      }}
    >
      <EuiText
        size="xs"
        css={{
          overflowWrap: 'anywhere',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {renderedByline}
      </EuiText>
    </EuiCard>
  );
};
