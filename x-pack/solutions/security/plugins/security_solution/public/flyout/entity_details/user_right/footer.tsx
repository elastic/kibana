/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TakeAction } from '../shared/components/take_action';
import type { IdentityFields } from '../../document_details/shared/utils';
import type { EntityStoreRecord } from '../shared/hooks/use_entity_from_store';

export const UserPanelFooter = ({
  userName: userNameProp,
  identityFields,
  entity,
}: {
  /**
   * The human-readable user name to use in the timeline KQL filter (e.g. from `entity.name` / `user.name`).
   * Takes priority over values derived from `identityFields`, which may contain only identity-field IDs
   * (e.g. `user.id`, `user.email`) when Entity Store v2 identifies entities by non-name fields.
   */
  userName?: string;
  identityFields: IdentityFields;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
}) => {
  const userName = useMemo(
    () => userNameProp || identityFields['user.name'] || '',
    [userNameProp, identityFields]
  );

  return (
    <EuiFlyoutFooter>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <TakeAction isDisabled={!userName} kqlQuery={`user.name: "${userName}"`} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
