/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule } from '@elastic/eui';
import { getFlattenedObject } from '@kbn/std';
import { EntityInsight } from '../../../cloud_security_posture/components/entity_insight';
import { useExpandSection } from '../../document_details/right/hooks/use_expand_section';
import { GENERIC_FLYOUT_STORAGE_KEYS } from './constants';
import type { GenericEntityRecord } from '../../../asset_inventory/types/generic_entity_record';
import { FieldsTable } from './components/fields_table';
import { ExpandableSection } from '../../document_details/right/components/expandable_section';
import { FlyoutBody } from '../../shared/components/flyout_body';

interface GenericEntityFlyoutContentProps {
  source: GenericEntityRecord;
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

  const [pinnedFields, setPinnedFields] = useState<string[]>([]);
  console.log(pinnedFields);
  // Load pinned fields from localStorage on mount
  useEffect(() => {
    const storedPinned = localStorage.getItem(
      GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS
    );
    if (storedPinned) {
      setPinnedFields(JSON.parse(storedPinned));
    }

    // Listen for changes in localStorage (to handle pin/unpin from other panels)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS) {
        const updatedPinnedFields = event.newValue ? JSON.parse(event.newValue) : [];
        setPinnedFields(updatedPinnedFields);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Filter the document based on the pinned fields
  const filteredDocument = React.useMemo(() => {
    const flattenedDocument = getFlattenedObject(source);

    // Filter out fields that are not in the pinned fields
    return Object.entries(flattenedDocument)
      .filter(([key]) => pinnedFields.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>);
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
        <FieldsTable document={filteredDocument} />
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
