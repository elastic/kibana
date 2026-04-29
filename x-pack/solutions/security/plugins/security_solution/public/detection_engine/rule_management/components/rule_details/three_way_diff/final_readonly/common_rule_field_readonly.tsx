/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  DiffableCommonFields,
  DiffableRule,
} from '../../../../../../../common/api/detection_engine';
import { RelatedIntegrationsReadOnly } from './fields/related_integrations/related_integrations';
import { RequiredFieldsReadOnly } from './fields/required_fields/required_fields';
import { SeverityMappingReadOnly } from './fields/severity_mapping/severity_mapping';
import { RiskScoreMappingReadOnly } from './fields/risk_score_mapping/risk_score_mapping';
import { ThreatReadOnly } from './fields/threat/threat';
import { NameReadOnly } from './fields/name/name';
import { TagsReadOnly } from './fields/tags/tags';
import { DescriptionReadOnly } from './fields/description/description';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { BuildingBlockReadOnly } from './fields/building_block/building_block';
import { InvestigationFieldsReadOnly } from './fields/investigation_fields/investigation_fields';
import { FalsePositivesReadOnly } from './fields/false_positives/false_positives';
import { MaxSignalsReadOnly } from './fields/max_signals/max_signals';
import { NoteReadOnly } from './fields/note/note';
import { RuleScheduleReadOnly } from './fields/rule_schedule/rule_schedule';
import { ReferencesReadOnly } from './fields/references/references';
import { RiskScoreReadOnly } from './fields/risk_score/risk_score';
import { RuleNameOverrideReadOnly } from './fields/rule_name_override/rule_name_override';
import { SetupReadOnly } from './fields/setup/setup';
import { SeverityReadOnly } from './fields/severity/severity';
import { TimestampOverrideReadOnly } from './fields/timestamp_override/timestamp_override';
import { TimelineTemplateReadOnly } from './fields/timeline_template/timeline_template';

interface CommonRuleFieldReadOnlyProps {
  fieldName: keyof DiffableCommonFields;
  finalDiffableRule: DiffableRule;
}

// eslint-disable-next-line complexity
export function CommonRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: CommonRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'building_block':
      return <BuildingBlockReadOnly buildingBlock={finalDiffableRule.building_block} />;
    case 'description':
      return <DescriptionReadOnly description={finalDiffableRule.description} />;
    case 'investigation_fields':
      return (
        <InvestigationFieldsReadOnly investigationFields={finalDiffableRule.investigation_fields} />
      );
    case 'false_positives':
      return <FalsePositivesReadOnly falsePositives={finalDiffableRule.false_positives} />;
    case 'max_signals':
      return <MaxSignalsReadOnly maxSignals={finalDiffableRule.max_signals} />;
    case 'name':
      return <NameReadOnly name={finalDiffableRule.name} />;
    case 'note':
      return <NoteReadOnly note={finalDiffableRule.note} />;
    case 'related_integrations':
      return (
        <RelatedIntegrationsReadOnly relatedIntegrations={finalDiffableRule.related_integrations} />
      );
    case 'required_fields':
      return <RequiredFieldsReadOnly requiredFields={finalDiffableRule.required_fields} />;
    case 'risk_score_mapping':
      return <RiskScoreMappingReadOnly riskScoreMapping={finalDiffableRule.risk_score_mapping} />;
    case 'rule_schedule':
      return <RuleScheduleReadOnly ruleSchedule={finalDiffableRule.rule_schedule} />;
    case 'severity_mapping':
      return <SeverityMappingReadOnly severityMapping={finalDiffableRule.severity_mapping} />;
    case 'tags':
      return <TagsReadOnly tags={finalDiffableRule.tags} />;
    case 'threat':
      return <ThreatReadOnly threat={finalDiffableRule.threat} />;
    case 'references':
      return <ReferencesReadOnly references={finalDiffableRule.references} />;
    case 'risk_score':
      return <RiskScoreReadOnly riskScore={finalDiffableRule.risk_score} />;
    case 'rule_id':
      /* Rule ID is not displayed in the UI */
      return null;
    case 'rule_name_override':
      return <RuleNameOverrideReadOnly ruleNameOverride={finalDiffableRule.rule_name_override} />;
    case 'setup':
      return <SetupReadOnly setup={finalDiffableRule.setup} />;
    case 'severity':
      return <SeverityReadOnly severity={finalDiffableRule.severity} />;
    case 'timestamp_override':
      return <TimestampOverrideReadOnly timestampOverride={finalDiffableRule.timestamp_override} />;
    case 'timeline_template':
      return <TimelineTemplateReadOnly timelineTemplate={finalDiffableRule.timeline_template} />;
    case 'version':
      /* Version is not displayed in the UI */
      return null;
    default:
      return assertUnreachable(fieldName);
  }
}
