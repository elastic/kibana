/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets } from '../../../../../../utils';
import { deleteAllRules } from '../../../../../../../../../common/utils/security_solution';
import { inlineQueryKqlQueryField } from './kql_query.inline_query';
// import { savedQueryKqlQueryField } from './kql_query.saved_query';
import { eqlQueryField } from './eql_query';
import { esqlQueryField } from './esql_query';
import { threatIndexField } from './threat_index';
import { threatQueryField } from './threat_query';
import { threatMappingField } from './threat_mapping';
import { threatIndicatorPathField } from './threat_indicator_path';
import { thresholdField } from './threshold';
import { machineLearningJobIdField } from './machine_learning_job_id';
import { anomalyThresholdField } from './anomaly_threshold';
import { newTermsFieldsField } from './new_terms_fields';
import { historyWindowStartField } from './history_window_start';

export default (context: FtrProviderContext): void => {
  const es = context.getService('es');
  const supertest = context.getService('supertest');
  const log = context.getService('log');

  describe('@ess @serverless @skipInServerlessMKI type specific diffable rule fields', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    // Custom Query, Threat Match, Threshold, New Terms rule types
    inlineQueryKqlQueryField(context);

    // Saved Query rule types
    // savedQueryKqlQueryField(context);

    // EQL rule type
    eqlQueryField(context);

    // ES|QL rule type
    esqlQueryField(context);

    // Threat Match rule type
    threatIndexField(context);
    threatQueryField(context);
    threatMappingField(context);
    threatIndicatorPathField(context);

    // Threshold rule type
    thresholdField(context);

    // Machine Learning rule type
    machineLearningJobIdField(context);
    anomalyThresholdField(context);

    // New Terms rule type
    newTermsFieldsField(context);
    historyWindowStartField(context);
  });
};
