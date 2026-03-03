/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets } from '../../../../../../utils';
import { thresholdField } from './threshold';
import { machineLearningJobIdField } from './machine_learning_job_id';
import { anomalyThresholdField } from './anomaly_threshold';
import { newTermsFieldsField } from './new_terms_fields';
import { historyWindowStartField } from './history_window_start';

export default (context: FtrProviderContext): void => {
  const es = context.getService('es');
  const supertest = context.getService('supertest');
  const log = context.getService('log');

  describe('@ess @serverless @skipInServerlessMKI type specific diffable rule fields (part 2)', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

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
