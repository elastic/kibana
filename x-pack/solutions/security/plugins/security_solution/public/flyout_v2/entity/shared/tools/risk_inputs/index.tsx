/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { noop } from 'lodash/fp';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { RiskScoreLeftPanelSubTab } from '../../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { EntityIconByType } from '../../../../../entity_analytics/components/entity_store/entity_icon_by_type';
import { RiskInputsTab } from '../../../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { cellActionRenderer } from '../../../../shared/components/cell_actions';
import { RISK_INPUTS_TITLE } from '../../../../shared/constants/flyout_titles';
import { RISK_INPUTS_TOOL_TEST_ID } from './test_ids';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';

const TITLE = RISK_INPUTS_TITLE;

const ICON_TYPE = EntityIconByType;

export interface RiskInputsProps {
  /** Which entity type this tool is scoped to. Controls the icon and entity type passed to the tab. */
  entityType: EntityType.host | EntityType.user | EntityType.service;
  /** Display name of the entity (typically `host.name` or `user.name`). */
  entityName: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Opens the originating entity flyout as a child. */
  onShowEntity?: () => void;
  /** Initial sub-tab to display. Forwarded from the `openDetailsPanel` call in the entity flyout. */
  subTab?: RiskScoreLeftPanelSubTab;
}

export const RiskInputs = memo(
  ({ entityType, entityName, entityId, onShowEntity, subTab }: RiskInputsProps) => {
    const { openDocumentFlyoutFromIndexAsChild } = useFlyoutApi();

    const onShowAlert = useCallback(
      (id: string, indexName: string, title?: string) => {
        openDocumentFlyoutFromIndexAsChild({
          documentId: id,
          indexName,
          renderCellActions: cellActionRenderer,
          onAlertUpdated: noop,
          origin: FLYOUT_ORIGIN.RISK_INPUTS_ALERT,
          title,
        });
      },
      [openDocumentFlyoutFromIndexAsChild]
    );

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <ToolsFlyoutHeader
            title={TITLE}
            onTitleClick={onShowEntity}
            label={entityName}
            iconType={ICON_TYPE[entityType]}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody data-test-subj={RISK_INPUTS_TOOL_TEST_ID}>
          <RiskInputsTab
            entityType={entityType}
            entityName={entityName}
            entityId={entityId}
            onShowAlert={onShowAlert}
            subTab={subTab}
          />
        </EuiFlyoutBody>
      </>
    );
  }
);

RiskInputs.displayName = 'RiskInputs';
