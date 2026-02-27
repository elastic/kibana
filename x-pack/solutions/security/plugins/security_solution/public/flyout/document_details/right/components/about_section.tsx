/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';
import { buildDataTableRecord, type DataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { ExpandableSection } from '../../../../flyout_v2/shared/components/expandable_section';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { RULE_PREVIEW_BANNER, RulePreviewPanelKey } from '../../../rule_details/right';
import { useKibana } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { ABOUT_SECTION_TEST_ID } from './test_ids';
import { Reason } from './reason';
import { MitreAttack } from './mitre_attack';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { useDocumentDetailsContext } from '../../shared/context';
import { isEcsAllowedValue } from '../utils/event_utils';
import { EventCategoryDescription } from './event_category_description';
import { EventKindDescription } from './event_kind_description';
import { EventRenderer } from './event_renderer';
import { AlertStatus } from './alert_status';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';
import { AlertDescription } from '../../../../flyout_v2/document/components/alert_description';
import { ABOUT_SECTION_TITLE } from '../../../../flyout_v2/document/components/about_section';

const KEY = 'about';

/**
 * Most top section of the overview tab.
 * For alerts (event.kind is signal), it contains the description, reason and mitre attack information.
 * For generic events (event.kind is event), it shows the event category description and event renderer.
 * For all other events, it shows the event kind description, a list of event categories and event renderer.
 */
export const AboutSection = memo(() => {
  const { telemetry } = useKibana().services;
  const { dataFormattedForFieldBrowser, getFieldsData, isRulePreview, scopeId, searchHit } =
    useDocumentDetailsContext();
  const { rulesPrivileges } = useUserPrivileges();
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const { ruleId, ruleName } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const eventKind = getField(getFieldsData('event.kind'));
  const eventKindInECS = eventKind && isEcsAllowedValue('event.kind', eventKind);

  const hit: DataTableRecord = useMemo(
    () => buildDataTableRecord(searchHit as EsHitRecord),
    [searchHit]
  );

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: true,
  });

  const ruleSummaryDisabled =
    isEmpty(ruleName) || isEmpty(ruleId) || isRulePreview || !rulesPrivileges?.rules.read;

  const openRulePreview = useCallback(() => {
    openPreviewPanel({
      id: RulePreviewPanelKey,
      params: {
        ruleId,
        banner: RULE_PREVIEW_BANNER,
        isPreviewMode: true,
      },
    });
    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
      location: scopeId,
      panel: 'preview',
    });
  }, [openPreviewPanel, scopeId, ruleId, telemetry]);

  const content =
    eventKind === EventKind.signal ? (
      <>
        <AlertDescription
          hit={hit}
          onShowRuleSummary={openRulePreview}
          ruleSummaryDisabled={ruleSummaryDisabled}
        />
        <Reason />
        <MitreAttack />
        <AlertStatus />
      </>
    ) : (
      <>
        {eventKindInECS &&
          (eventKind === 'event' ? (
            // if event kind is event, show a detailed description based on event category
            <EventCategoryDescription />
          ) : (
            // if event kind is not event, show a higher level description on event kind
            <EventKindDescription eventKind={eventKind} />
          ))}
        <EventRenderer />
      </>
    );

  return (
    <ExpandableSection
      expanded={expanded}
      title={ABOUT_SECTION_TITLE}
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      gutterSize="s"
      data-test-subj={ABOUT_SECTION_TEST_ID}
    >
      {content}
    </ExpandableSection>
  );
});

AboutSection.displayName = 'AboutSection';
