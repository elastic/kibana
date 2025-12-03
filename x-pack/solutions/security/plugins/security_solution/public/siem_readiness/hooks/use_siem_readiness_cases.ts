/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

interface CaseFlyoutParams {
  title: string;
  description: string;
}

export const useSiemReadinessCases = () => {
  const { services } = useKibana();
  const { useCasesAddToNewCaseFlyout } = services.cases.hooks;

  const genericCase = useCasesAddToNewCaseFlyout({
    initialValue: {
      title: i18n.translate(
        'xpack.securitySolution.siemReadiness.coverage.dataCoverage.caseTitle',
        {
          defaultMessage: 'Data Coverage Issue',
        }
      ),
      description: i18n.translate(
        'xpack.securitySolution.siemReadiness.coverage.dataCoverage.caseDescription',
        {
          defaultMessage:
            "We've identified a data coverage gap that may impact detection capabilities...",
        }
      ),
    },
  });

  return {
    openGenericCaseFlyout: genericCase.open,
  };
};
