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
import type { GenericEntityRecord } from '../../../asset_inventory/types/generic_entity_record';
import {
  EntityDetailsLeftPanelTab,
  type EntityDetailsPath,
} from '../shared/components/left_panel/left_panel_header';
import type { CloudPostureEntityIdentifier } from '../../../cloud_security_posture/components/entity_insight';
import { EntityInsight } from '../../../cloud_security_posture/components/entity_insight';
import { useExpandSection } from '../../document_details/right/hooks/use_expand_section';
import { GENERIC_FLYOUT_STORAGE_KEYS } from './constants';
import { FieldsTable, usePinnedFields } from './components/fields_table';
import { ExpandableSection } from '../../document_details/right/components/expandable_section';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { ExpandablePanel } from '../../shared/components/expandable_panel';

const defaultPinnedFields = [
  'entity.name',
  'entity.id',
  'entity.category',
  'entity.type',
  'asset.criticality',
  'user.name',
  'user.email',
  'host.name',
  'host.os',
  'cloud.account.id',
  'cloud.region',
  'cloud.account.name',
];

interface GenericEntityFlyoutContentProps {
  source: GenericEntityRecord;
  openGenericEntityDetailsPanelByPath: (path: EntityDetailsPath) => void;
  insightsField: CloudPostureEntityIdentifier;
  insightsValue: string;
}

export const GenericEntityFlyoutContent = ({
  source,
  openGenericEntityDetailsPanelByPath,
  insightsField,
  insightsValue,
}: GenericEntityFlyoutContentProps) => {
  const { euiTheme } = useEuiTheme();

  const fieldsSectionExpandedState = useExpandSection({
    title: GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_SECTION,
    defaultValue: true,
  });

  const { pinnedFields } = usePinnedFields(GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS);

  const filteredDocument = useMemo(() => {
    if (!source) return {};

    const flattenedDocument = getFlattenedObject(source);

    const filtered = Object.entries(flattenedDocument).reduce(
      (acc: Record<string, unknown>, [key, value]) => {
        if (pinnedFields?.includes(key)) {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

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
              callback: () =>
                openGenericEntityDetailsPanelByPath({
                  tab: EntityDetailsLeftPanelTab.FIELDS_TABLE,
                }),
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
            tableStorageKey={GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS}
            euiInMemoryTableProps={{ search: undefined, pagination: undefined }}
            defaultPinnedFields={defaultPinnedFields}
          />
        </ExpandablePanel>
      </ExpandableSection>

      <EuiHorizontalRule />

      <EntityInsight
        field={insightsField}
        value={insightsValue}
        isPreviewMode={false}
        isLinkEnabled={true}
        openDetailsPanel={openGenericEntityDetailsPanelByPath}
      />
    </FlyoutBody>
  );
};

GenericEntityFlyoutContent.displayName = 'GenericEntityFlyoutContent';
