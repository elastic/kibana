/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../../../flyout/document_details/shared/constants/local_storage';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { InvestigationGuide } from './investigation_guide';
import { InvestigationGuide as InvestigationGuideToolsFlyout } from '../../investigation_guide/investigation_guide';
import { flyoutProviders } from '../../shared/components/flyout_provider';

export const INVESTIGATION_SECTION_TEST_ID = `${PREFIX}InvestigationSection` as const;

export const INVESTIGATION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.investigation.sectionTitle',
  {
    defaultMessage: 'Investigation',
  }
);

const LOCAL_STORAGE_SECTION_KEY = 'investigation';

export interface InvestigationSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
}

/**
 * Second section of the overview tab in details flyout.
 * It contains investigation guide (alerts only) and highlighted fields.
 */
export const InvestigationSection = memo(({ hit }: InvestigationSectionProps) => {
  const { services } = useKibana();
  const { overlays } = services;

  const isAlert = useMemo(() => {
    const eventKind = getFieldValue(hit, 'event.kind') as string;
    return eventKind === 'signal';
  }, [hit]);

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: LOCAL_STORAGE_SECTION_KEY,
    defaultValue: true,
  });

  const onShowInvestigationGuide = useCallback(() => {
    overlays.openSystemFlyout(
      flyoutProviders({
        services,
        children: <InvestigationGuideToolsFlyout hit={hit} />,
      }),
      {
        ownFocus: false,
        // @ts-ignore EUI to fix this typing issue
        resizable: true,
        size: 'm',
        type: 'overlay',
      }
    );
  }, [hit, overlays, services]);

  return (
    <ExpandableSection
      data-test-subj={INVESTIGATION_SECTION_TEST_ID}
      expanded={expanded}
      gutterSize="s"
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={LOCAL_STORAGE_SECTION_KEY}
      title={INVESTIGATION_SECTION_TITLE}
    >
      {isAlert ? (
        <InvestigationGuide
          hit={hit}
          isAvailable={true}
          onShowInvestigationGuide={onShowInvestigationGuide}
        />
      ) : null}
    </ExpandableSection>
  );
});

InvestigationSection.displayName = 'InvestigationSection';
