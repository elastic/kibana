/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getFlattenedObject } from '@kbn/std';
import { useOpenGenericEntityDetailsLeftPanel } from './hooks/use_open_generic_entity_details_left_panel';
import { EntityInsight } from '../../../cloud_security_posture/components/entity_insight';
import { useExpandSection } from '../../document_details/right/hooks/use_expand_section';
import { GENERIC_FLYOUT_STORAGE_KEYS } from './constants';
import { FieldsTable, usePinnedFields } from './components/fields_table';
import { ExpandableSection } from '../../document_details/right/components/expandable_section';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { ExpandablePanel } from '../../shared/components/expandable_panel';

interface GenericEntityFlyoutContentProps {
  source: Record<string, unknown>;
  entityDocId: string;
  scopeId: string;
}

export const GenericEntityFlyoutContent = ({
  source,
  entityDocId,
  scopeId,
}: GenericEntityFlyoutContentProps) => {
  const { euiTheme } = useEuiTheme();

  const { openGenericEntityDetails } = useOpenGenericEntityDetailsLeftPanel({
    field: 'entity.id',
    value: source.entity.id,
    entityDocId,
    scopeId,
    panelTab: 'fields',
  });

  const openDetailsPanel = (path: { tab: string; subT }) => {
    return openGenericEntityDetails(path);
  };

  const fieldsSectionExpandedState = useExpandSection({
    title: GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_SECTION,
    defaultValue: true,
  });

  const { pinnedFields } = usePinnedFields(GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS);

  const filteredDocument = useMemo(() => {
    if (!source) return {};

    const flattenedDocument = getFlattenedObject(source);

    const filtered = Object.entries(flattenedDocument).reduce((acc, [key, value]) => {
      if (pinnedFields?.includes(key)) {
        acc[key] = value;
      }
      return acc;
    }, {});

    return filtered;
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
        <ExpandablePanel
          header={{
            iconType: 'arrowStart',
            title: (
              <EuiTitle
                css={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                <FormattedMessage
                  id="xpack.securitySolution.genericEntityFlyout.flyoutContent.expandablePanel.highlightedFieldsLabel"
                  defaultMessage="Highlighted Fields"
                />
              </EuiTitle>
            ),
            link: {
              callback: openGenericEntityDetails,
              tooltip: (
                <FormattedMessage
                  id="xpack.securitySolution.genericEntityFlyout.flyoutContent.expandablePanel.highlightedFieldsTooltip"
                  defaultMessage="Show all fields"
                />
              ),
            },
          }}
        >
          <FieldsTable
            document={filteredDocument}
            euiInMemoryTableProps={{ search: null, pagination: null }}
          />
        </ExpandablePanel>
      </ExpandableSection>

      <EuiHorizontalRule />

      <EntityInsight
        // field={'entity.id'}
        // value={source.entity.id}
        field={'agent.type'}
        value={'cloudbeat'}
        isPreviewMode={false}
        isLinkEnabled={true}
        openDetailsPanel={openDetailsPanel}
      />
    </FlyoutBody>
  );
};
