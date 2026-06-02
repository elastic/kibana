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
import { RiskInputsTab } from '../../../../../entity_analytics/components/flyout_v2/risk_inputs_tab';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { RISK_INPUTS_TOOL_TEST_ID } from './test_ids';

const TITLE = i18n.translate('xpack.securitySolution.flyout.entityDetails.host.riskInputs.title', {
  defaultMessage: 'Risk score',
});

export interface RiskInputsProps {
  /** Display name of the host (typically `host.name`). */
  entityName: string;
  /** Scope id (timeline id, table id, etc.) passed to downstream containers. */
  scopeId: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Opens the originating host flyout as a child. */
  onOpenHost?: () => void;
}

export const RiskInputs = memo(({ entityName, scopeId, entityId, onOpenHost }: RiskInputsProps) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <ToolsFlyoutHeader
          title={TITLE}
          onTitleClick={onOpenHost}
          label={entityName}
          iconType="storage"
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj={RISK_INPUTS_TOOL_TEST_ID}>
        <RiskInputsTab
          entityType={EntityType.host}
          entityName={entityName}
          scopeId={scopeId}
          entityId={entityId}
        />
      </EuiFlyoutBody>
    </>
  );
});

RiskInputs.displayName = 'RiskInputs';
