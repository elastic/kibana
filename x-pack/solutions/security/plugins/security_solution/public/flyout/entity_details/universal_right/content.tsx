/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EntityType } from '../../../../common/entity_analytics/types';
import { AssetCriticalityAccordion } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import type { GenericEntityRecord } from '../../../asset_inventory/types/generic_entity_record';
import { FieldsTable } from './components/fields_table';
import { ExpandableSection } from '../../document_details/right/components/expandable_section';
import { FlyoutBody } from '../../shared/components/flyout_body';

interface UniversalEntityFlyoutContentProps {
  source: GenericEntityRecord;
}

export const UniversalEntityFlyoutContent = ({ source }: UniversalEntityFlyoutContentProps) => {
  return (
    <FlyoutBody>
      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.universalEntityFlyout.flyoutContent.expandableSection.fieldsLabel"
            defaultMessage="Fields"
          />
        }
        expanded
        localStorageKey={'universal_flyout:overview:fields_section'}
      >
        <AssetCriticalityAccordion
          entity={{ name: 'test', type: EntityType.host }}
          onChange={() => {}}
        />
        <FieldsTable
          document={source || {}}
          tableStorageKey={'universal_flyout:overview:fields_table_pins'}
        />
      </ExpandableSection>
    </FlyoutBody>
  );
};
