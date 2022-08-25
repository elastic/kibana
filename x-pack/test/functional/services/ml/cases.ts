/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneType } from '@kbn/ml-plugin/public/application/explorer/explorer_constants';
import { AnomalySwimlaneEmbeddableInput } from '@kbn/ml-plugin/public';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlAnomalySwimLane } from './swim_lane';

export interface CaseParams {
  title: string;
  description: string;
  reporter: string;
  tag: string;
}

export interface Attachment {
  swimLaneType: SwimlaneType;
}

export function MachineLearningCasesProvider(
  { getPageObject, getService }: FtrProviderContext,
  mlAnomalySwimLane: MlAnomalySwimLane
) {
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const elasticChart = getService('elasticChart');

  return {
    async openCaseInCasesApp(tag: string) {
      await cases.navigation.navigateToApp('cases', 'cases-app');
      await cases.casesTable.waitForTableToFinishLoading();
      await cases.casesTable.filterByTag(tag);
      await cases.casesTable.waitForTableToFinishLoading();
      await cases.casesTable.goToFirstListedCase();
    },

    async assertCaseWithAnomalySwimLaneAttachment(
      params: CaseParams,
      attachment: AnomalySwimlaneEmbeddableInput,
      expectedSwimLaneState: {
        yAxisLabelCount: number;
      }
    ) {
      await this.openCaseInCasesApp(params.tag);
      await elasticChart.setNewChartUiDebugFlag(true);

      // Assert case details
      await cases.singleCase.assertCaseTitle(params.title);
      await cases.singleCase.assertCaseDescription(params.description);

      await testSubjects.existOrFail('comment-persistableState-ml_anomaly_swimlane');

      await mlAnomalySwimLane.waitForSwimLanesToLoad();
      await mlAnomalySwimLane.assertAxisLabelCount(
        `mlSwimLaneEmbeddable_${attachment.id}`,
        'y',
        expectedSwimLaneState.yAxisLabelCount
      );
    },
  };
}
