/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { TakeAction } from '../shared/components/take_action';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../../common/search_strategy';
import type { IdentityFields } from '../../document_details/shared/utils';
import type { EntityStoreRecord } from '../shared/hooks/use_entity_from_store';
import { getRiskFromEntityRecord } from '../shared/entity_store_risk_utils';
import { AiAssistantButton } from '../../../entity_analytics/components/ai_assistant_button/ai_assistant_button';
import type { EntityToAttach } from '../../../cases/attachments/entity';
import { useEntityCaseTakeActionItems } from '../../../cases/attachments/entity/hooks/use_entity_case_take_action_items';

export const ServicePanelFooter = ({
  serviceName,
  identityFields,
  entity,
  flyoutFooterProps,
  panelProps,
}: {
  /**
   * Display name the flyout was opened with. Used for the "Add to chat" attachment so it
   * matches the identifier the risk-score tab's AiAssistantButton sends for the same entity,
   * rather than a value derived from `identityFields`.
   */
  serviceName: string;
  identityFields: IdentityFields;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
  /**
   * Overrides forwarded to the outer `EuiFlyoutFooter` (e.g. `css` for compact spacing in the EUI
   * system flyout). Legacy callers omit this and keep the default.
   */
  flyoutFooterProps?: React.ComponentProps<typeof EuiFlyoutFooter>;
  /**
   * Overrides for the inner `EuiPanel` (e.g. `{ paddingSize: 'none' }`). Legacy callers omit this.
   */
  panelProps?: React.ComponentProps<typeof EuiPanel>;
}) => {
  const identityServiceName = useMemo(
    () =>
      identityFields[EntityIdentifierFields.serviceName] || Object.values(identityFields)[0] || '',
    [identityFields]
  );

  const euidApi = useEntityStoreEuidApi();
  const euidEntityFilter = useMemo((): string | undefined => {
    if (!euidApi?.euid || !entity) {
      return undefined;
    }
    return euidApi.euid.kql.getEuidFilterBasedOnDocument('service', entity);
  }, [euidApi?.euid, entity]);

  const entityStoreId = entity?.entity?.id;
  const risk = entity ? getRiskFromEntityRecord(entity) : undefined;
  const riskLevel = risk?.calculated_level as RiskSeverity | undefined;
  const riskScore = risk?.calculated_score_norm;

  const entityToAttach = useMemo<EntityToAttach>(
    () => ({
      id: entityStoreId ?? '',
      name: identityServiceName,
      type: 'service',
      riskLevel,
      riskScore,
    }),
    [entityStoreId, identityServiceName, riskLevel, riskScore]
  );
  const additionalItems = useEntityCaseTakeActionItems(entityToAttach);

  return (
    <EuiFlyoutFooter {...flyoutFooterProps}>
      <EuiPanel color="transparent" {...panelProps}>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <AiAssistantButton
              entityType={EntityType.service}
              entityName={serviceName}
              telemetryPathway="entity_flyout"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TakeAction
              isDisabled={!identityServiceName}
              kqlQuery={euidEntityFilter ?? `service.name: "${identityServiceName}"`}
              additionalItems={additionalItems}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
