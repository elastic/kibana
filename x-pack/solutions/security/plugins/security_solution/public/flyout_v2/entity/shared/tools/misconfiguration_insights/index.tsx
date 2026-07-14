/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  EntityIdentifierFields,
  EntityType,
} from '../../../../../../common/entity_analytics/types';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { EntityIconByType } from '../../../../../entity_analytics/components/entity_store/entity_icon_by_type';
import { MisconfigurationFindingsDetailsTable } from '../../../../../cloud_security_posture/components/csp_details/misconfiguration_findings_details_table';
import type { CloudPostureEntityIdentifier } from '../../../../../cloud_security_posture/components/entity_insight';
import { MISCONFIGURATION_INSIGHTS_TOOL_TEST_ID } from './test_ids';

const TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.misconfigurationInsights.title',
  { defaultMessage: 'Misconfigurations' }
);

const ICON_TYPE = EntityIconByType;
const FIELD: Record<
  EntityType.host | EntityType.user | EntityType.generic,
  CloudPostureEntityIdentifier
> = {
  [EntityType.host]: EntityIdentifierFields.hostName,
  [EntityType.user]: EntityIdentifierFields.userName,
  // `related.entity` carries the entity id used to filter findings for generic entities.
  [EntityType.generic]: 'related.entity',
};

export interface MisconfigurationInsightsProps {
  /** Which entity type this tool is scoped to. Controls the icon, query field, and entity type passed to the table. */
  entityType: EntityType.host | EntityType.user | EntityType.generic;
  /** Field value used to query misconfigurations — e.g. `host.name` for hosts, the entity id for generic. */
  value: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Opens the originating entity flyout as a child. */
  onShowEntity?: () => void;
}

/**
 * Tool flyout displaying CSP misconfiguration findings for an entity.
 */
export const MisconfigurationInsights = memo(
  ({ entityType, value, entityId, onShowEntity }: MisconfigurationInsightsProps) => {
    const { openMisconfigurationFindingAsChild } = useFlyoutApi();

    const onShowFinding = useCallback(
      (resourceId: string, ruleId: string) => {
        openMisconfigurationFindingAsChild({ resourceId, ruleId }, { title: value });
      },
      [openMisconfigurationFindingAsChild, value]
    );

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <ToolsFlyoutHeader
            title={TITLE}
            onTitleClick={onShowEntity}
            label={value}
            iconType={ICON_TYPE[entityType]}
          />
        </EuiFlyoutHeader>
        <div className="eui-yScroll" data-test-subj={MISCONFIGURATION_INSIGHTS_TOOL_TEST_ID}>
          <MisconfigurationFindingsDetailsTable
            field={FIELD[entityType]}
            value={value}
            entityId={entityId}
            entityType={entityType}
            onShowFinding={onShowFinding}
          />
        </div>
      </>
    );
  }
);

MisconfigurationInsights.displayName = 'MisconfigurationInsights';
