/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { GENERIC_FLYOUT_STORAGE_KEYS } from './constants';
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
        localStorageKey={GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_SECTION}
      >
        <FieldsTable
          document={source || {}}
          tableStorageKey={GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS}
        />
      </ExpandableSection>
    </FlyoutBody>
  );
};
