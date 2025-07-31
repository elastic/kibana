/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets } from '../../../../../../utils';
import { deleteAllRules } from '../../../../../../../../../common/utils/security_solution';
import { nameField } from './name';
import { descriptionField } from './description';
import { tagsField } from './tags';
import { severityField } from './severity';
import { severityMappingField } from './severity_mapping';
import { riskScoreField } from './risk_score';
import { riskScoreMappingField } from './risk_score_mapping';
import { referencesField } from './references';
import { falsePositivesField } from './false_positives';
import { threatField } from './threat';
import { noteField } from './note';
import { setupField } from './setup';
import { relatedIntegrationsField } from './related_integrations';
import { requiredFieldsField } from './required_fields';
import { ruleScheduleField } from './rule_schedule';
import { maxSignalsField } from './max_signals';
import { ruleNameOverrideField } from './rule_name_override';
import { timestampOverrideField } from './timestamp_override';
import { timelineTemplateField } from './timeline_template';
import { buildingBlockField } from './building_block';
import { investigationFieldsField } from './investigation_fields';
import { dataSourceField } from './data_source';
import { alertSuppressionField } from './alert_suppression';

export default (context: FtrProviderContext): void => {
  const es = context.getService('es');
  const supertest = context.getService('supertest');
  const log = context.getService('log');

  describe('@ess @serverless @skipInServerlessMKI common diffable rule fields', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    // Common fields
    nameField(context);
    descriptionField(context);
    tagsField(context);
    severityField(context);
    severityMappingField(context);
    riskScoreField(context);
    riskScoreMappingField(context);
    referencesField(context);
    falsePositivesField(context);
    threatField(context);
    noteField(context);
    setupField(context);
    relatedIntegrationsField(context);
    requiredFieldsField(context);
    ruleScheduleField(context);
    maxSignalsField(context);
    ruleNameOverrideField(context);
    timestampOverrideField(context);
    timelineTemplateField(context);
    buildingBlockField(context);
    investigationFieldsField(context);
    dataSourceField(context);
    alertSuppressionField(context);
  });
};
