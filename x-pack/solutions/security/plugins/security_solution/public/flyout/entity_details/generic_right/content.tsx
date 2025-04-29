/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule } from '@elastic/eui';
import { EntityInsight } from '../../../cloud_security_posture/components/entity_insight';
import { useExpandSection } from '../../document_details/right/hooks/use_expand_section';
import { GENERIC_FLYOUT_STORAGE_KEYS } from './constants';
import { FieldsTable } from './components/fields_table';
import { ExpandableSection } from '../../document_details/right/components/expandable_section';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { usePinnedFields } from './hooks/usePinnedFields'; // Import custom hook

interface GenericEntityFlyoutContentProps {
  source: Record<string, unknown>; // Assuming 'source' is the document object
}

export const GenericEntityFlyoutContent = ({ source }: GenericEntityFlyoutContentProps) => {
  const fieldsSectionExpandedState = useExpandSection({
    title: GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_SECTION,
    defaultValue: true,
  });

  const insightsSectionExpandedState = useExpandSection({
    title: GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_INSIGHTS_SECTION,
    defaultValue: true,
  });

  // Use the usePinnedFields hook to get the pinned fields
  const { pinnedFields } = usePinnedFields(GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS);

  // Filter the document based on pinned fields
  const filteredDocument = useMemo(() => {
    if (!source) return {}; // If no document is provided, return empty object

    const flattenedDocument = Object.entries(source).reduce((acc, [key, value]) => {
      if (pinnedFields.includes(key)) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    return flattenedDocument;
  }, [source, pinnedFields]);

  return (
    <FlyoutBody>
      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.genericEntityFlyout.flyoutContent.expandableSection.fieldsLabel"
            defaultMessage="Fields"
          />
        }
        expanded={fieldsSectionExpandedState}
        localStorageKey={GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_SECTION}
      >
        <FieldsTable
          document={filteredDocument} // Pass the filtered document to FieldsTable
        />
      </ExpandableSection>

      <EuiHorizontalRule />

      <EntityInsight
        field={'agent.type'}
        value={'cloudbeat'}
        isPreviewMode={false}
        isLinkEnabled={false}
        openDetailsPanel={() => {}}
      />
    </FlyoutBody>
  );
};
