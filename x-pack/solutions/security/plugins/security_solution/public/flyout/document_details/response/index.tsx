/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import styled from 'styled-components';
import { css } from '@emotion/react';
import { OpenInvestigatedDocument } from '../shared/components/open_investigated_document';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { RESPONSE_DETAILS_TEST_ID } from './test_ids';
import { useResponseActionsView } from './hooks/use_response_actions_view';
import type { DocumentDetailsProps } from '../shared/types';
import { useDocumentDetailsContext } from '../shared/context';

const ExtendedFlyoutWrapper = styled.div`
 figure {
  background-color: white
`;

export const ResponsePanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { euiTheme } = useEuiTheme();
  const { eventId, scopeId, indexName, searchHit, dataAsNestedObject, isRulePreview } =
    useDocumentDetailsContext();

  const responseActionsView = useResponseActionsView({
    rawEventData: searchHit,
    ecsData: dataAsNestedObject,
  });

  return (
    <FlyoutBody
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <OpenInvestigatedDocument eventId={eventId} indexName={indexName} scopeId={scopeId} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <div data-test-subj={RESPONSE_DETAILS_TEST_ID}>
        {isRulePreview ? (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.response.previewMessage"
            defaultMessage="Response is not available in alert preview."
          />
        ) : (
          <>
            <EuiTitle size="xxxs">
              <h5>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.left.response.responseTitle"
                  defaultMessage="Responses"
                />
              </h5>
            </EuiTitle>
            <EuiSpacer size="s" />

            <ExtendedFlyoutWrapper>{responseActionsView?.content}</ExtendedFlyoutWrapper>
          </>
        )}
      </div>
    </FlyoutBody>
  );
});

ResponsePanel.displayName = 'ResponsePanel';
