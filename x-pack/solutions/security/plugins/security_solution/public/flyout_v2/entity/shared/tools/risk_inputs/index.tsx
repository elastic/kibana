/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { RiskInputsTab } from '../../../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { RISK_INPUTS_TOOL_TEST_ID } from './test_ids';

const TITLE = i18n.translate('xpack.securitySolution.flyout.entityDetails.riskInputs.title', {
  defaultMessage: 'Risk score',
});

const ICON_TYPE = { [EntityType.host]: 'storage', [EntityType.user]: 'user' } as const;

export interface RiskInputsProps {
  /** Whether this tool is scoped to a host or user entity. Controls the icon and entity type passed to the tab. */
  entityType: EntityType.host | EntityType.user;
  /** Display name of the entity (typically `host.name` or `user.name`). */
  entityName: string;
  /** Scope id (timeline id, table id, etc.) passed to downstream containers. */
  scopeId: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Opens the originating entity flyout as a child. */
  onOpen?: () => void;
}

export const RiskInputs = memo(
  ({ entityType, entityName, scopeId, entityId, onOpen }: RiskInputsProps) => (
    <>
      <EuiFlyoutHeader hasBorder>
        <ToolsFlyoutHeader
          title={TITLE}
          onTitleClick={onOpen}
          label={entityName}
          iconType={ICON_TYPE[entityType]}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj={RISK_INPUTS_TOOL_TEST_ID}>
        <RiskInputsTab
          entityType={entityType}
          entityName={entityName}
          scopeId={scopeId}
          entityId={entityId}
          isInV2Flyout
        />
      </EuiFlyoutBody>
    </>
  )
);

RiskInputs.displayName = 'RiskInputs';
