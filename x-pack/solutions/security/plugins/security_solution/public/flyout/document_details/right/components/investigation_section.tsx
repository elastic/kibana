/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useExpandSection } from '../hooks/use_expand_section';
import { ExpandableSection } from './expandable_section';
import { HighlightedFields } from './highlighted_fields';
import { INVESTIGATION_SECTION_TEST_ID } from './test_ids';
import { InvestigationGuide } from './investigation_guide';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { useDocumentDetailsContext } from '../../shared/context';

const KEY = 'investigation';

/**
 * Second section of the overview tab in details flyout.
 * It contains investigation guide (alerts only) and highlighted fields.
 */
export const InvestigationSection = memo(() => {
  const { dataFormattedForFieldBrowser, getFieldsData, investigationFields, scopeId } =
    useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));
  const ancestorIndex = getField(getFieldsData('signal.ancestors.index')) ?? '';

  const expanded = useExpandSection({ title: KEY, defaultValue: true });

  const editHighlightedFieldsEnabled = useIsExperimentalFeatureEnabled('editHighlightedFields');

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.investigation.sectionTitle"
          defaultMessage="Investigation"
        />
      }
      localStorageKey={KEY}
      gutterSize="none"
      data-test-subj={INVESTIGATION_SECTION_TEST_ID}
    >
      {eventKind === EventKind.signal && (
        <>
          <InvestigationGuide />
          <EuiSpacer size="m" />
        </>
      )}
      <HighlightedFields
        dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
        investigationFields={investigationFields}
        scopeId={scopeId}
        showCellActions={true}
        showEditButton={editHighlightedFieldsEnabled}
        ancestorsIndexName={ancestorIndex}
      />
    </ExpandableSection>
  );
});

InvestigationSection.displayName = 'InvestigationSection';
