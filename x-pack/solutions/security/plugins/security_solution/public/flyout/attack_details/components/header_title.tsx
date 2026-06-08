/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { flyoutHeaderBlockStyles } from '../../../flyout_v2/shared/components/flyout_header_block';
import { Notes } from '../../../flyout_v2/shared/components/notes';
import { HeaderTitle as V2HeaderTitle } from '../../../flyout_v2/attack/main/components/header_title';
import { Status } from './status';
import { Assignees } from './assignees';
import { useAttackDetailsContext } from '../context';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';

/**
 * Header title for the legacy attack details flyout.
 * Bridges context → props for the v2 HeaderTitle, then renders
 * the status/assignees/notes blocks for legacy flyout compatibility.
 * The Assignees block is wrapped by the v2 Assignees component itself,
 * so this file does not add an outer FlyoutHeaderBlock around it.
 */
export const HeaderTitle = memo(() => {
  const { searchHit, attackId } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const openNotesTab = useNavigateToAttackDetailsLeftPanel({ tab: 'notes' });

  return (
    <>
      <V2HeaderTitle hit={hit} />
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <Status />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <Assignees />
            </EuiFlexItem>
            <EuiFlexItem>
              <Notes documentId={attackId} onShowNotes={openNotesTab} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
