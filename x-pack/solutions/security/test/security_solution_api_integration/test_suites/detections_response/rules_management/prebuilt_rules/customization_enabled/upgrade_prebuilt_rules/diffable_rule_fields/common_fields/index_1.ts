/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets } from '../../../../../../utils';
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

export default (context: FtrProviderContext): void => {
  const es = context.getService('es');
  const supertest = context.getService('supertest');
  const log = context.getService('log');

  describe('@ess @serverless @skipInServerlessMKI common diffable rule fields (Part 1)', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

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
  });
};
