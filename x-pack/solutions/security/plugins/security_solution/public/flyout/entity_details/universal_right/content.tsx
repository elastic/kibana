/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { EuiBasicTable } from '@elastic/eui';
import { ExpandableSection } from '../../document_details/right/components/expandable_section';
import { FlyoutBody } from '../../shared/components/flyout_body';

interface UniversalEntityFlyoutContentProps {
  entity: EntityEcs;
}

export const UniversalEntityFlyoutContent = ({ entity }: UniversalEntityFlyoutContentProps) => {
  const columns = [
    {
      field: 'field',
      name: <strong>{'Field'}</strong>,
      width: '150px',
    },
    {
      field: 'value',
      name: <strong>{'Value'}</strong>,
    },
  ];

  // Extract values from the entity object
  const items = Object.entries(entity).map(([field, value]) => ({
    field,
    value: value?.value || value, // Use optional chaining to handle nested objects
  }));

  return (
    <FlyoutBody>
      <ExpandableSection
        title={'Fields'}
        expanded
        localStorageKey={'universal_flyout:overview:fields_table'}
      >
        <EuiBasicTable columns={columns} items={items} />
      </ExpandableSection>
    </FlyoutBody>
  );
};
