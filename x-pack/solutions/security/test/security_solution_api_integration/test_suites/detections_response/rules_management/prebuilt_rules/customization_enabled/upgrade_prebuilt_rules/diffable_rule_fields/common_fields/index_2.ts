/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets } from '../../../../../../utils';
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

  describe('@ess @serverless @skipInServerlessMKI common diffable rule fields (Part 2)', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

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
