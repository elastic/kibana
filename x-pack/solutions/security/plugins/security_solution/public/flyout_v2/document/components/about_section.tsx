/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React, { memo, useMemo } from 'react';
import { FLYOUT_STORAGE_KEYS } from '../../../flyout/document_details/shared/constants/local_storage';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { AlertDescription } from './alert_description';
import { AlertReason } from './alert_reason';

export const ABOUT_SECTION_TEST_ID = `${PREFIX}AboutSection` as const;

export const ABOUT_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.about.sectionTitle',
  {
    defaultMessage: 'About',
  }
);

const LOCAL_STORAGE_SECTION_KEY = 'about';

export interface AboutSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
}

/**
 * Most top section of the overview tab.
 * For alerts (event.kind is signal), it contains the description, reason and mitre attack information.
 * For generic events (event.kind is event), it shows the event category description and event renderer.
 * For all other events, it shows the event kind description, a list of event categories and event renderer.
 */
export const AboutSection = memo(({ hit }: AboutSectionProps) => {
  const isAlert = useMemo(() => (getFieldValue(hit, 'event.kind') as string) === 'signal', [hit]);

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: LOCAL_STORAGE_SECTION_KEY,
    defaultValue: true,
  });

  return (
    <ExpandableSection
      data-test-subj={ABOUT_SECTION_TEST_ID}
      expanded={expanded}
      gutterSize="m"
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={LOCAL_STORAGE_SECTION_KEY}
      title={ABOUT_SECTION_TITLE}
    >
      {isAlert ? (
        <>
          <EuiFlexItem grow={false}>
            <AlertDescription hit={hit} onShowRuleSummary={undefined} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertReason hit={hit} onShowFullReason={undefined} />
          </EuiFlexItem>
        </>
      ) : null}
    </ExpandableSection>
  );
});

AboutSection.displayName = 'AboutSection';
