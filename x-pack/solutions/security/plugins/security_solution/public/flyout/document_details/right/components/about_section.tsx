/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';
import {
  buildDataTableRecord,
  type DataTableRecord,
  type EsHitRecord,
  getFieldValue,
} from '@kbn/discover-utils';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FLYOUT_STORAGE_KEYS } from '../../../../flyout_v2/document/constants/local_storage';
import { ExpandableSection } from '../../../../flyout_v2/shared/components/expandable_section';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { RULE_PREVIEW_BANNER, RulePreviewPanelKey } from '../../../rule_details/right';
import { useKibana } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { DocumentDetailsAlertReasonPanelKey } from '../../shared/constants/panel_keys';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { EventKind } from '../../../../flyout_v2/document/constants/event_kinds';
import { useDocumentDetailsContext } from '../../shared/context';
import { isEcsAllowedValue } from '../../../../flyout_v2/document/utils/event_utils';
import { EventCategoryDescription } from '../../../../flyout_v2/document/components/event_category_description';
import { EventKindDescription } from '../../../../flyout_v2/document/components/event_kind_description';
import { EventRenderer } from '../../../../flyout_v2/document/components/event_renderer';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';
import { AlertDescription } from '../../../../flyout_v2/document/components/alert_description';
import {
  ABOUT_SECTION_TEST_ID,
  ABOUT_SECTION_TITLE,
} from '../../../../flyout_v2/document/components/about_section';
import { AlertStatus } from '../../../../flyout_v2/document/components/alert_status';
import {
  ALERT_REASON_BANNER,
  AlertReason,
} from '../../../../flyout_v2/document/components/alert_reason';
import { MitreAttack } from '../../../../flyout_v2/document/components/mitre_attack';

const KEY = 'about';

/**
 * Most top section of the overview tab.
 * For alerts (event.kind is signal), it contains the description, reason and mitre attack information.
 * For generic events (event.kind is event), it shows the event category description and event renderer.
 * For all other events, it shows the event kind description, a list of event categories and event renderer.
 */
export const AboutSection = memo(() => {
  const { telemetry } = useKibana().services;
  const {
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
    eventId,
    indexName,
    isRulePreview,
    scopeId,
    searchHit,
  } = useDocumentDetailsContext();
  const canReadRules = useUserPrivileges().rulesPrivileges.rules.read;
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const { ruleId, ruleName } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const hit: DataTableRecord = useMemo(
    () => buildDataTableRecord(searchHit as EsHitRecord),
    [searchHit]
  );

  const eventKind = useMemo(() => getFieldValue(hit, 'event.kind') as string, [hit]);
  const eventKindInECS = eventKind && isEcsAllowedValue('event.kind', eventKind);

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: true,
  });

  const ruleSummaryDisabled =
    isEmpty(ruleName) || isEmpty(ruleId) || isRulePreview || !canReadRules;

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

  const openAlertReasonPreview = useCallback(() => {
    openPreviewPanel({
      id: DocumentDetailsAlertReasonPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
        banner: ALERT_REASON_BANNER,
      },
    });
    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
      location: scopeId,
      panel: 'preview',
    });
  }, [eventId, indexName, openPreviewPanel, scopeId, telemetry]);

  const content =
    eventKind === EventKind.signal ? (
      <>
        <AlertDescription
          hit={hit}
          onShowRuleSummary={openRulePreview}
          ruleSummaryDisabled={ruleSummaryDisabled}
        />
        <AlertReason hit={hit} onShowFullReason={openAlertReasonPreview} />
        <MitreAttack hit={hit} />
        <AlertStatus hit={hit} />
      </>
    ) : (
      <>
        {eventKindInECS &&
          (eventKind === 'event' ? (
            // if event kind is event, show a detailed description based on event category
            <EventCategoryDescription hit={hit} />
          ) : (
            // if event kind is not event, show a higher level description on event kind
            <EventKindDescription hit={hit} />
          ))}
        <EventRenderer hit={hit} dataAsNestedObject={dataAsNestedObject} />
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
