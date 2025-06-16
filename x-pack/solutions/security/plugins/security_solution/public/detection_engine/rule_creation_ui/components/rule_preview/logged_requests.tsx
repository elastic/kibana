/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { css } from '@emotion/react';

import type { RulePreviewLogs } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { OptimizedAccordion } from './optimized_accordion';
import { LoggedRequestsItem } from './logged_requests_item';
import { useAccordionStyling } from './use_accordion_styling';

const LoggedRequestsComponent: FC<{ logs: RulePreviewLogs[]; ruleType: Type }> = ({
  logs,
  ruleType,
}) => {
  const cssStyles = useAccordionStyling();

  const AccordionContent = useMemo(
    () => (
      <>
        <EuiSpacer size="m" />
        {logs.map((log) => (
          <React.Fragment key={log.startedAt}>
            <LoggedRequestsItem {...log} ruleType={ruleType} />
          </React.Fragment>
        ))}
      </>
    ),
    [logs, ruleType]
  );

  if (logs.length === 0) {
    return null;
  }

  return (
    <>
      <OptimizedAccordion
        id="preview-logged-requests-accordion"
        data-test-subj="preview-logged-requests-accordion"
        buttonContent={i18n.LOGGED_REQUESTS_ACCORDION_BUTTON}
        borders="horizontal"
        css={css`
          ${cssStyles}
        `}
      >
        {AccordionContent}
      </OptimizedAccordion>
    </>
  );
};

export const LoggedRequests = React.memo(LoggedRequestsComponent);
LoggedRequests.displayName = 'LoggedRequests';
