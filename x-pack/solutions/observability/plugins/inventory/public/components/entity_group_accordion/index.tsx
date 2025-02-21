/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { EntityCountBadge } from './entity_count_badge';
import { GroupedEntitiesGrid } from './grouped_entities_grid';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search_context';

const ENTITIES_COUNT_BADGE = i18n.translate(
  'xpack.inventory.inventoryGroupPanel.entitiesBadgeLabel',
  { defaultMessage: 'Entities' }
);

export interface Props {
  groupValue: string;
  groupLabel: string;
  groupCount: number;
  isLoading?: boolean;
}

export function EntityGroupAccordion({ groupValue, groupLabel, groupCount, isLoading }: Props) {
  const { euiTheme } = useEuiTheme();
  const [open, setOpen] = useState(false);
  const { setSingleEntityType } = useUnifiedSearchContext();

  const onToggle = useCallback(() => {
    if (!open) setSingleEntityType(groupValue);
    setOpen((opened) => !opened);
  }, [groupValue, open, setSingleEntityType]);

  return (
    <>
      <EuiPanel
        hasBorder
        hasShadow={false}
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.size.base};
        `}
      >
        <EuiAccordion
          data-test-subj={`inventoryGroup_entityType_${groupValue}`}
          id={`inventoryGroup-entityType-${groupValue}`}
          buttonContent={
            <EuiTitle size="xs">
              <h4 data-test-subj={`inventoryGroupTitle_entityType_${groupValue}`}>{groupLabel}</h4>
            </EuiTitle>
          }
          buttonElement="div"
          extraAction={
            <EntityCountBadge
              data-test-subj={`entityCountBadge_entityType_${groupValue}`}
              name={ENTITIES_COUNT_BADGE}
              value={groupCount}
            />
          }
          buttonProps={{ paddingSize: 'm' }}
          paddingSize="none"
          onToggle={onToggle}
          isLoading={isLoading}
        />
      </EuiPanel>
      {open && (
        <EuiPanel
          css={css`
            margin: 0 ${euiTheme.size.s};
            border-top: none;
            border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
          `}
          hasBorder
          hasShadow={false}
          paddingSize="m"
        >
          <GroupedEntitiesGrid groupValue={groupValue} />
        </EuiPanel>
      )}
      <EuiSpacer size="s" />
    </>
  );
}
