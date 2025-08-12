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

/**
 * Given a list of cases, returns the link to the first case's detail page,
 * and the link to the overview page if there is > 1 case.
 * @param cases the cases to get links for
 * @returns the first case link and the cases overview link
 */
export function useCaseLinks(cases?: Cases): CaseLinks {
  const [activeSpace, setActiveSpace] = useState<string | null>(null);
  const [firstCaseLink, setFirstCaseLink] = useState<string | null>(null);
  const [casesOverviewLink, setCasesOverviewLink] = useState<string | null>(null);
  const {
    share,
    http: { basePath: httpBasePath },
    spaces,
  } = useKibana().services;

  const basePath = httpBasePath.serverBasePath;
  useEffect(() => {
    if (!spaces) return;
    const sub = spaces.getActiveSpace$().subscribe((space) => {
      setActiveSpace(space.id);
    });
    return () => {
      sub.unsubscribe();
    };
  }, [spaces]);
  const { casesOverviewLocator, caseDetailLocator } = useMemo(
    () => ({
      casesOverviewLocator: share.url.locators.get(casesOverviewLocatorID),
      caseDetailLocator: share.url.locators.get(casesDetailLocatorID),
    }),
    [share.url.locators]
  );

  useEffect(() => {
    const spaceId = activeSpace !== 'default' && activeSpace !== null ? activeSpace : undefined;
    casesOverviewLocator?.getLocation({ basePath, spaceId }).then((location) => {
      setCasesOverviewLink(location.path);
    });
    if (cases && cases.length > 0) {
      caseDetailLocator
        ?.getLocation({
          caseId: cases[0].id,
          basePath,
          spaceId,
        })
        .then((location) => {
          setFirstCaseLink(location.path);
        });
    }
  }, [activeSpace, basePath, caseDetailLocator, cases, casesOverviewLocator]);

  return { firstCaseLink, casesOverviewLink };
}
