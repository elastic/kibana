/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty, EuiNotificationBadge, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { encode } from '@kbn/rison';
import { useSiemReadinessGetCasesCountByTags } from '@kbn/siem-readiness';
import { useBasePath } from '../../../common/lib/kibana';

interface ViewCasesButtonProps {
  caseTagsArray: string[];
  'data-test-subj'?: string;
}

export const ViewCasesButton: React.FC<ViewCasesButtonProps> = ({
  caseTagsArray,
  'data-test-subj': dataTestSubj = 'viewCaseButton',
}) => {
  const { euiTheme } = useEuiTheme();
  const basePath = useBasePath();

  const casesUrl = useMemo(() => {
    const filterParams = { tags: caseTagsArray };
    const encodedFilterParams = encodeURIComponent(encode(filterParams));
    return `${basePath}/app/security/cases?cases=${encodedFilterParams}`;
  }, [basePath, caseTagsArray]);

  const casesByTagsQuery = useSiemReadinessGetCasesCountByTags(caseTagsArray);

  return (
    <EuiButtonEmpty size="s" href={casesUrl} target="_blank" data-test-subj={dataTestSubj}>
      {i18n.translate('xpack.securitySolution.siemReadiness.viewCases', {
        defaultMessage: 'View Cases',
      })}
      <EuiNotificationBadge color="subdued" style={{ marginLeft: euiTheme.size.s }}>
        {casesByTagsQuery.data?.total ?? 0}
      </EuiNotificationBadge>
    </EuiButtonEmpty>
  );
};
