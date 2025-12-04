/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useState, useEffect } from 'react';

interface CaseFlyoutParams {
  title: string;
  description: string;
}

export const useSiemReadinessCases = () => {
  const { services } = useKibana();
  const { useCasesAddToNewCaseFlyout } = services.cases.hooks;

  const [formParams, setFormParams] = useState({
    title: '',
    description: '',
  });

  const genericCase = useCasesAddToNewCaseFlyout({
    initialValue: formParams,
  });

  const openFlyout = (flyoutParams: { title: string; description: string }) => {
    setFormParams(flyoutParams);
  };

  useEffect(() => {
    if (formParams.title || formParams.description) {
      genericCase.open();
    }
    // @ts-ignore
  }, [formParams]);

  return {
    openFlyout,
  };
};
