/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams, generatePath } from 'react-router-dom';
import { useSelectedLocation } from '../../monitor_details/hooks/use_selected_location';
import { TEST_RUN_DETAILS_ROUTE } from '../../../../../../common/constants/ui';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { useTestRunDetailsBreadcrumbs } from '../../test_run_details/hooks/use_test_run_details_breadcrumbs';
import { PLUGIN } from '../../../../../../common/constants/plugin';

export const useStepDetailsBreadcrumbs = (extraCrumbs?: Array<{ text: string; href?: string }>) => {
  const { data, currentStep } = useJourneySteps();
  const kibana = useKibana();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';

  const params = useParams<{
    checkGroupId: string;
    monitorId: string;
  }>();

  const selectedLocation = useSelectedLocation();

  useTestRunDetailsBreadcrumbs([
    {
      text: data ? moment(data.details?.timestamp).format('LLL') : '',
      href: `${appPath}/${generatePath(TEST_RUN_DETAILS_ROUTE, params)}?locationId=${
        selectedLocation?.id ?? ''
      }`,
    },

    { text: `${currentStep?.synthetics.step?.index}. ${currentStep?.synthetics.step?.name}` ?? '' },
  ]);
};
