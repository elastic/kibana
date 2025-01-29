/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';
import { EntitySourceTag } from '../types';

interface SourceFilterProps {
  selectedItems: EntitySourceTag[];
  onChange: (selectedItems: EntitySourceTag[]) => void;
}

export const EntitySourceFilter: React.FC<SourceFilterProps> = ({ selectedItems, onChange }) => {
  return (
    <MultiselectFilter<EntitySourceTag>
      title={i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.entitySource.filterTitle',
        {
          defaultMessage: 'Source',
        }
      )}
      items={Object.values(EntitySourceTag)}
      selectedItems={selectedItems}
      onSelectionChange={onChange}
      width={190}
    />
  );
};
