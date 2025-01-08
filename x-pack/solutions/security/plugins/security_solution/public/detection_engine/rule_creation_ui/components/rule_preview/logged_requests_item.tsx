/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { css } from '@emotion/css';

import { EuiSpacer, EuiCodeBlock, useEuiPaddingSize, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RulePreviewLogs } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { OptimizedAccordion } from './optimized_accordion';
import { useAccordionStyling } from './use_accordion_styling';

const LoggedRequestsItemComponent: FC<PropsWithChildren<RulePreviewLogs>> = ({
  startedAt,
  duration,
  requests,
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
      {(requests ?? []).map((request, key) => (
        <EuiFlexItem
          key={key}
          css={css`
            padding-left: ${paddingLarge};
          `}
        >
          <EuiSpacer size="l" />
          <span data-test-subj="preview-logged-request-description">
            {request?.description ?? null} {request?.duration ? `[${request.duration}ms]` : null}
          </span>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="json"
            isCopyable
            overflowHeight={300}
            isVirtualized
            data-test-subj="preview-logged-request-code-block"
          >
            {request.request}
          </EuiCodeBlock>
        </EuiFlexItem>
      ))}
    </OptimizedAccordion>
  );
};

export const LoggedRequestsItem = React.memo(LoggedRequestsItemComponent);
LoggedRequestsItem.displayName = 'LoggedRequestsItem';
