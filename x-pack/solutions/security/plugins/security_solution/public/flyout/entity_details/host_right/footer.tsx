/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TakeAction } from '../shared/components/take_action';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import type { EntityIdentifiers } from '../../document_details/shared/utils';
import type { EntityStoreRecord } from '../shared/hooks/use_entity_from_store';

export const HostPanelFooter = ({
  entityIdentifiers,
  entity,
}: {
  entityIdentifiers: EntityIdentifiers;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
}) => {
  const hostName = useMemo(
    () =>
      entityIdentifiers[EntityIdentifierFields.hostName] ||
      Object.values(entityIdentifiers)[0] ||
      '',
    [entityIdentifiers]
  );

  return (
    <EuiFlyoutFooter>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <TakeAction isDisabled={!hostName} kqlQuery={`host.name: "${hostName}"`} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
