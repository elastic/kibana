/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import { useEuiPaddingSize, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RulePreviewLogs } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { OptimizedAccordion } from './optimized_accordion';
import { LoggedRequestsQuery } from './logged_requests_query';
import { useAccordionStyling } from './use_accordion_styling';
import { LoggedRequestsPages, isPageViewSupported } from './logged_requests_pages';

const LoggedRequestsItemComponent: FC<PropsWithChildren<RulePreviewLogs & { ruleType: Type }>> = ({
  startedAt,
  duration,
  requests = [],
  ruleType,
}) => {
  const paddingLarge = useEuiPaddingSize('l');
  const cssStyles = useAccordionStyling();
  return (
    <OptimizedAccordion
      data-test-subj="preview-logged-requests-item-accordion"
      buttonContent={
        <>
          {startedAt ? (
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.queryPreview.loggedRequestItemAccordionButtonLabel"
              defaultMessage="Rule execution started at {time}."
              values={{ time: <PreferenceFormattedDate value={new Date(startedAt)} /> }}
            />
          ) : (
            i18n.LOGGED_REQUEST_ITEM_ACCORDION_UNKNOWN_TIME_BUTTON
          )}
          {`[${duration}ms]`}
        </>
      }
      id={`ruleExecution-${startedAt}`}
      css={css`
        margin-left: ${paddingLarge};
        ${cssStyles}
      `}
    >
      {requests.length > 2 ? (
        <>
          <EuiSpacer size="s" />
          <EuiText
            color="warning"
            size="s"
            css={css`
              margin-left: ${paddingLarge};
            `}
          >
            {i18n.REQUESTS_SAMPLE_WARNING}
          </EuiText>
          <EuiSpacer size="s" />
        </>
      ) : null}
      {isPageViewSupported(ruleType) ? (
        <LoggedRequestsPages requests={requests} ruleType={ruleType} />
      ) : (
        requests.map((request, key) => <LoggedRequestsQuery key={key} {...request} />)
      )}
    </OptimizedAccordion>
  );
};

export const LoggedRequestsItem = React.memo(LoggedRequestsItemComponent);
LoggedRequestsItem.displayName = 'LoggedRequestsItem';
