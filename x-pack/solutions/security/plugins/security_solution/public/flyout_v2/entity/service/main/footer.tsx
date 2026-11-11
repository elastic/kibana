/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { TakeAction } from '../../../../flyout/entity_details/shared/components/take_action';
import { EntityIdentifierFields, EntityType } from '../../../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import type { IdentityFields } from '../../../../flyout/document_details/shared/utils';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { getRiskFromEntityRecord } from '../../../../flyout/entity_details/shared/entity_store_risk_utils';
import { AiAssistantButton } from '../../../../entity_analytics/components/ai_assistant_button/ai_assistant_button';
import type { EntityToAttach } from '../../../../cases/attachments/entity';
import { useEntityCaseTakeActionItems } from '../../../../cases/attachments/entity/hooks/use_entity_case_take_action_items';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { useInvalidateEntityGrid } from '../../../../entity_analytics/components/home/entities_grid/hooks/use_invalidate_entity_grid';

export interface FooterProps {
  /**
   * Display name the flyout was opened with. Used for the "Add to chat" attachment so it
   * matches the identifier the risk-score tab's AiAssistantButton sends for the same entity,
   * rather than a value derived from `identityFields`.
   */
  serviceName: string;
  identityFields: IdentityFields;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
}

/**
 * Footer for the service details flyout containing the "Add to chat" and TakeAction buttons.
 */
export const Footer = ({ serviceName, identityFields, entity }: FooterProps) => {
  const isInSecurityApp = useIsInSecurityApp();
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
    return euidApi.euid.kql.getEuidFilterBasedOnDocument(
      euidApi.getBuiltInEntityDefinition('service'),
      entity
    );
  }, [euidApi, entity]);

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
  const invalidateEntityGrid = useInvalidateEntityGrid();
  const additionalItems = useEntityCaseTakeActionItems(entityToAttach, {
    onSuccess: invalidateEntityGrid,
  });

  return (
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
          isDisabled={!identityServiceName || !isInSecurityApp}
          kqlQuery={euidEntityFilter ?? `service.name: "${identityServiceName}"`}
          additionalItems={additionalItems}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
