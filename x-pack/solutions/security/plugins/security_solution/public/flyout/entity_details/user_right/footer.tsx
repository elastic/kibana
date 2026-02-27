/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TakeAction } from '../shared/components/take_action';
import type { EntityIdentifiers } from '../../document_details/shared/utils';

export const UserPanelFooter = ({
  entityIdentifiers,
}: {
  entityIdentifiers: EntityIdentifiers;
}) => {
  return (
    <EuiFlyoutFooter>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <TakeAction
              isDisabled={!entityIdentifiers}
              kqlQuery={`user.name: "${entityIdentifiers}"`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
