/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW,
  VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { EuiHorizontalRule } from '@elastic/eui';
import { useExpandSection } from '../../document_details/right/hooks/use_expand_section';
import { AlertCountInsight } from '../../document_details/shared/components/alert_count_insight';
import { GENERIC_FLYOUT_STORAGE_KEYS } from './constants';
import type { GenericEntityRecord } from '../../../asset_inventory/types/generic_entity_record';
import { FieldsTable } from './components/fields_table';
import { ExpandableSection } from '../../document_details/right/components/expandable_section';
import { FlyoutBody } from '../../shared/components/flyout_body';
import {
  ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID,
  ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID,
  ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID,
} from '../../document_details/right/components/test_ids';
import { MisconfigurationsInsight } from '../../document_details/shared/components/misconfiguration_insight';
import { VulnerabilitiesInsight } from '../../document_details/shared/components/vulnerabilities_insight';

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
          document={source || {}}
          tableStorageKey={GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS}
        />
      </ExpandableSection>

      <EuiHorizontalRule />

      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.genericEntityFlyout.flyoutContent.expandableSection.insightsLabel"
            defaultMessage="Insights"
          />
        }
        expanded={insightsSectionExpandedState}
        localStorageKey={GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_INSIGHTS_SECTION}
      >
        <AlertCountInsight
          fieldName={'entity.id'}
          name={source?.entity?.id}
          // fieldName={'agent.type'}
          // name={'cloudbeat'}
          // openDetailsPanel={() => {}}
          data-test-subj={ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID}
        />
        <MisconfigurationsInsight
          fieldName={'entity.id'}
          name={source?.entity?.id}
          // openDetailsPanel={openDetailsPanel}
          data-test-subj={ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID}
          telemetryKey={MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW}
        />
        <VulnerabilitiesInsight
          hostName={source?.entity?.id}
          // openDetailsPanel={openDetailsPanel}
          data-test-subj={ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID}
          telemetryKey={VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW}
        />
      </ExpandableSection>
    </FlyoutBody>
  );
};
