/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import { useKibanaServices } from './use_kibana_services';
import { useDigitalExperienceRouter } from './use_digital_experience_router';
import { useListQuery } from './use_list_query';

/** The URL of the Applications list, with the list's current query. */
export const useApplicationsHref = (): string => {
  const { application } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const listQuery = useListQuery();

  return application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, {
    path: router.link('/', { query: listQuery }),
  });
};
