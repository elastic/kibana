/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { APPLICATION_TYPE } from '../../common/application_source';
import type { ApplicationType } from '../../common/types/applications';
import { useQueryParam } from './use_query_param';
import { useUpdateUrlQuery } from './use_update_url_query';

/** The filter only the other type's tab shows. */
const OTHER_TYPE_FILTER = {
  [APPLICATION_TYPE.web]: 'platformFilter',
  [APPLICATION_TYPE.mobile]: 'sourceFilter',
} as const satisfies Record<ApplicationType, string>;

/**
 * The applications list's tab, `undefined` until one is picked. Picking one clears the other tab's
 * filter, so it never narrows a tab, its badge or its links where its control isn't shown.
 */
export const useApplicationType = (): {
  applicationType: ApplicationType | undefined;
  setApplicationType: (applicationType: ApplicationType | undefined) => void;
} => {
  const { value: applicationType } = useQueryParam('applicationType');
  const updateUrlQuery = useUpdateUrlQuery();

  const setApplicationType = useCallback(
    (type: ApplicationType | undefined) =>
      updateUrlQuery(
        type
          ? { applicationType: type, [OTHER_TYPE_FILTER[type]]: undefined }
          : { applicationType: type }
      ),
    [updateUrlQuery]
  );

  return { applicationType, setApplicationType };
};
