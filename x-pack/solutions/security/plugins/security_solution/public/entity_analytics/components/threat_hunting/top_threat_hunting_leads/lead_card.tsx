/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { HuntingLead } from './types';
import { renderTextWithEntity } from './shared_lead_components';
import { THREAT_HUNTING_LEADS_SCOPE_ID } from './utils';

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
        <EuiToolTip content={lead.title} anchorClassName="eui-textTruncate" display="block">
          <span tabIndex={0}>{lead.title}</span>
        </EuiToolTip>
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
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  );
};
