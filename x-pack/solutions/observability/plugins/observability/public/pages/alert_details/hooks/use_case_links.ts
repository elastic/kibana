/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Cases } from '@kbn/cases-plugin/common';
import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../utils/kibana_react';
import { casesDetailLocatorID, casesOverviewLocatorID } from '../../../../common';

interface CaseLinks {
  firstCaseLink: string | null;
  casesOverviewLink: string | null;
}

export function useCaseLinks(cases?: Cases): CaseLinks {
  const [firstCaseLink, setFirstCaseLink] = useState<string | null>(null);
  const [casesOverviewLink, setCasesOverviewLink] = useState<string | null>(null);
  const { share } = useKibana().services;

  const { casesOverviewLocator, caseDetailLocator } = useMemo(
    () => ({
      casesOverviewLocator: share.url.locators.get(casesOverviewLocatorID),
      caseDetailLocator: share.url.locators.get(casesDetailLocatorID),
    }),
    [share.url.locators]
  );

  useEffect(() => {
    casesOverviewLocator?.getLocation({}).then((location) => {
      setCasesOverviewLink(location?.path || null);
    });
    if (cases && cases.length > 0) {
      caseDetailLocator
        ?.getLocation({
          caseId: cases[0].id,
        })
        .then((location) => {
          setFirstCaseLink(location?.path || null);
        });
    }
  }, [caseDetailLocator, cases, casesOverviewLocator]);

  return { firstCaseLink, casesOverviewLink };
}
