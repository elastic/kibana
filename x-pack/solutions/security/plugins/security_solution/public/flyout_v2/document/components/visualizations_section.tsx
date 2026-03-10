/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';

export const VISUALIZATION_SECTION_TEST_ID = `${PREFIX}Visualizations` as const;

export const VISUALIZATION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.visualizations.sectionTitle',
  {
    defaultMessage: 'Visualizations',
  }
);

const LOCAL_STORAGE_SECTION_KEY = 'visualizations';

export interface VisualizationsSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
}

/**
 * Third section of the overview tab in details flyout.
 * It contains analyzer preview and session view preview.
 */
export const VisualizationsSection = memo(({ hit }: VisualizationsSectionProps) => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: LOCAL_STORAGE_SECTION_KEY,
    defaultValue: false,
  });

  const onShowAnalyzer = useCallback(() => {}, []);

  return (
    <ExpandableSection
      data-test-subj={VISUALIZATION_SECTION_TEST_ID}
      expanded={expanded}
      gutterSize="s"
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={LOCAL_STORAGE_SECTION_KEY}
      title={VISUALIZATION_SECTION_TITLE}
    >
      <AnalyzerPreviewContainer
        hit={hit}
        onShowAnalyzer={onShowAnalyzer}
        shouldUseAncestor={false}
        showIcon={false}
        disableNavigation={false}
      />
    </ExpandableSection>
  );
});

VisualizationsSection.displayName = 'VisualizationsSection';
