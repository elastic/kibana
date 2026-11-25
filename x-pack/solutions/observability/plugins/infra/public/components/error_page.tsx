/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { PageTemplate } from './page_template';
import { ERROR_CALLOUT_MAX_WIDTH, filledPageSectionContentCss } from './empty_states/layout';

interface Props {
  detailedMessage?: React.ReactNode;
  /** Kept on source-error pages so AppHeader/menu still render. */
  header?: React.ReactNode;
  retry?: () => void;
  shortMessage: React.ReactNode;
}

const centeredErrorCss = css`
  width: 100%;
  max-width: ${ERROR_CALLOUT_MAX_WIDTH};
`;

// Represents a fully constructed page, including page template.
export const ErrorPage: React.FC<Props> = ({ detailedMessage, header, retry, shortMessage }) => {
  const errorCallout = (
    <EuiCallOut
      color="danger"
      iconType="cross"
      title={
        <FormattedMessage
          id="xpack.infra.errorPage.errorOccurredTitle"
          defaultMessage="An error occurred"
        />
      }
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>{shortMessage}</EuiFlexItem>
        {retry ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="infraErrorPageTryAgainButton"
              onClick={retry}
              iconType="refresh"
            >
              <FormattedMessage
                id="xpack.infra.errorPage.tryAgainButtonLabel"
                defaultMessage="Try again"
              />
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {detailedMessage ? (
        <>
          <EuiSpacer />
          <div>{detailedMessage}</div>
        </>
      ) : null}
    </EuiCallOut>
  );

  if (!header) {
    return <PageTemplate isEmptyState={true}>{errorCallout}</PageTemplate>;
  }

  // isEmptyState centers every child, including AppHeader. Pin the header at the top
  // and center only the error callout in the remaining pane.
  return (
    <PageTemplate
      pageSectionProps={{
        paddingSize: 'none',
        contentProps: {
          css: filledPageSectionContentCss,
        },
      }}
    >
      {header}
      <EuiPageSection alignment="center" grow>
        <div css={centeredErrorCss}>{errorCallout}</div>
      </EuiPageSection>
    </PageTemplate>
  );
};
