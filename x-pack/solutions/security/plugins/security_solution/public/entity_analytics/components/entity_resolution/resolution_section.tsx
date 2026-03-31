/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiAccordion, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ExpandablePanel } from '../../../flyout_v2/shared/components/expandable_panel';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useResolutionGroup } from './hooks/use_resolution_group';
import { ResolutionGroupTable } from './resolution_group_table';
import {
  RESOLUTION_SECTION_TITLE,
  RESOLUTION_GROUP_LINK_TITLE,
  RESOLUTION_GROUP_LINK_TOOLTIP,
} from './translations';
import { RESOLUTION_SECTION_TEST_ID } from './test_ids';
import { getEntityId } from './helpers';

interface ResolutionSectionProps {
  entityId: string;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}

export const ResolutionSection: React.FC<ResolutionSectionProps> = ({
  entityId,
  openDetailsPanel,
}) => {
  const {
    data: group,
    isLoading,
    isFetching,
    isError,
  } = useResolutionGroup(entityId, {
    enabled: !!entityId,
  });

  const handleOpenResolutionTab = useCallback(() => {
    openDetailsPanel({ tab: EntityDetailsLeftPanelTab.RESOLUTION_GROUP });
  }, [openDetailsPanel]);

  const targetEntityId = group?.target ? getEntityId(group.target) : undefined;

  return (
    <EuiAccordion
      id="resolution_section"
      initialIsOpen
      buttonContent={
        <EuiTitle size="xs">
          <h3>{RESOLUTION_SECTION_TITLE}</h3>
        </EuiTitle>
      }
      data-test-subj={RESOLUTION_SECTION_TEST_ID}
    >
      <EuiSpacer size="m" />
      <ExpandablePanel
        header={{
          title: RESOLUTION_GROUP_LINK_TITLE,
          link: {
            callback: handleOpenResolutionTab,
            tooltip: RESOLUTION_GROUP_LINK_TOOLTIP,
          },
          iconType: 'arrowStart',
        }}
        expand={{ expandable: false }}
      >
        <ResolutionGroupTable
          group={group ?? null}
          isLoading={isLoading || isFetching}
          isError={isError}
          targetEntityId={targetEntityId}
        />
      </ExpandablePanel>
    </EuiAccordion>
  );
};
