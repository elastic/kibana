/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldsTable } from './components/fields_table';
import { ExpandableSection } from '../../document_details/right/components/expandable_section';
import { FlyoutBody } from '../../shared/components/flyout_body';

interface UniversalEntityFlyoutContentProps {
  source: EsHitRecord['_source'];
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
        localStorageKey={'universal_flyout:overview:fields_table'}
      >
        <FieldsTable document={source || {}} />
      </ExpandableSection>
    </FlyoutBody>
  );
};
