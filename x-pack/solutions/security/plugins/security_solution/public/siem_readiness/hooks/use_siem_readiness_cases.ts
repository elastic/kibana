/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '../../common/lib/kibana';

interface CaseFlyoutParams {
  title: string;
  description: string;
  tags: string[];
}

export const useSiemReadinessCases = () => {
  const { services } = useKibana();
  const { useCasesAddToNewCaseFlyout } = services.cases.hooks;

  const [formParams, setFormParams] = useState<CaseFlyoutParams>({
    title: '',
    description: '',
    tags: [],
  });

  const genericCase = useCasesAddToNewCaseFlyout({
    initialValue: formParams,
  });

  const openNewCaseFlyout = (flyoutParams: CaseFlyoutParams) => {
    // TODO: siem-readiness, fix this workaround
    if (flyoutParams.description) {
      sessionStorage.setItem(
        'cases.securitySolution.createCase.description.markdownEditor',
        flyoutParams.description
      );
    }
    setFormParams(flyoutParams);
  };

  useEffect(() => {
    if (formParams.title || formParams.description) {
      genericCase.open();
    }
    // ignoring other changes to prevent the flyout from reopening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formParams]);

  return {
    openNewCaseFlyout,
  };
};
