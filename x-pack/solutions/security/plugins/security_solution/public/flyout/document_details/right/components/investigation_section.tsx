/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { buildDataTableRecord, type DataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { isCCSRemoteIndexName } from '@kbn/es-query';
import { cellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { FLYOUT_STORAGE_KEYS } from '../../../../flyout_v2/document/constants/local_storage';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../../flyout_v2/shared/components/expandable_section';
import { HighlightedFields } from '../../../../flyout_v2/document/components/highlighted_fields';
import {
  INVESTIGATION_SECTION_TEST_ID,
  INVESTIGATION_SECTION_TITLE,
} from '../../../../flyout_v2/document/components/investigation_section';
import { InvestigationGuide } from '../../../../flyout_v2/document/components/investigation_guide';
import { getField } from '../../shared/utils';
import { EventKind } from '../../../../flyout_v2/document/constants/event_kinds';
import { useDocumentDetailsContext } from '../../shared/context';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { LeftPanelInvestigationTab } from '../../left';

const KEY = 'investigation';

/**
 * Second section of the overview tab in details flyout.
 * For alerts (event.kind is signal), it contains investigation guide and highlighted fields.
 * For generic events (event.kind is event), it shows only highlighted fields.
 */
export const InvestigationSection = memo(() => {
  const { getFieldsData, investigationFields, isRulePreview, scopeId, searchHit, indexName } =
    useDocumentDetailsContext();
  const isAlert = useMemo(
    () => getField(getFieldsData('event.kind')) === EventKind.signal,
    [getFieldsData]
  );
  const ancestorIndex = useMemo(
    () => getField(getFieldsData('signal.ancestors.index')) ?? '',
    [getFieldsData]
  );

  const hit: DataTableRecord = useMemo(
    () => buildDataTableRecord(searchHit as EsHitRecord),
    [searchHit]
  );

  const isRemoteDocument = useMemo(() => isCCSRemoteIndexName(indexName), [indexName]);

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: true,
  });

  const onShowInvestigationGuide = useNavigateToLeftPanel({
    tab: LeftPanelInvestigationTab,
  });

  return (
    <ExpandableSection
      expanded={expanded}
      title={INVESTIGATION_SECTION_TITLE}
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      gutterSize="none"
      data-test-subj={INVESTIGATION_SECTION_TEST_ID}
    >
      {isAlert && !isRemoteDocument && (
        <>
          <InvestigationGuide
            isAvailable={!isRulePreview}
            hit={hit}
            onShowInvestigationGuide={onShowInvestigationGuide}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <HighlightedFields
        hit={hit}
        investigationFields={investigationFields}
        scopeId={scopeId}
        renderCellActions={cellActionRenderer}
        showPreview={true}
        ancestorsIndexName={ancestorIndex}
        hideEditButton={isRemoteDocument}
      />
    </ExpandableSection>
  );
});

InvestigationSection.displayName = 'InvestigationSection';
