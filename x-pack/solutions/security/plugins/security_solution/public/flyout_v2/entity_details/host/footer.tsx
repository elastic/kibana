/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { TakeAction } from '../../../flyout/entity_details/shared/components/take_action';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import type { IdentityFields } from '../../../flyout/document_details/shared/utils';
import type { EntityStoreRecord } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';

export interface FooterProps {
  identityFields: IdentityFields;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
}

/**
 * Footer for the host details flyout containing the asset-inventory TakeAction button.
 */
export const Footer = ({ identityFields, entity }: FooterProps) => {
  const hostName = useMemo(
    () => identityFields[EntityIdentifierFields.hostName] || Object.values(identityFields)[0] || '',
    [identityFields]
  );

  const euidApi = useEntityStoreEuidApi();
  const euidEntityFilter = useMemo((): string | undefined => {
    if (!euidApi?.euid || !entity) {
      return undefined;
    }
    return euidApi.euid.kql.getEuidFilterBasedOnDocument('host', entity);
  }, [euidApi?.euid, entity]);

  return (
    <EuiPanel color="transparent">
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false}>
          <TakeAction
            isDisabled={!hostName}
            kqlQuery={euidEntityFilter ?? `host.name: "${hostName}"`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
