/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import * as i18n from './translations';

interface Props {
  failureReason: string | null | undefined;
}

const FailureComponent: React.FC<Props> = ({ failureReason }) => {
  const Failures = useMemo(() => {
    const failures = failureReason != null ? failureReason.split('\n') : '';
    const [firstFailure, ...restFailures] = failures;

    return (
      <>
        <p>{firstFailure}</p>

        {restFailures.length > 0 && (
          <EuiAccordion
            id="failuresFccordion"
            buttonContent={i18n.DETAILS}
            data-test-subj="failuresAccordion"
            paddingSize="s"
          >
            <>
              {restFailures.map((failure, i) => (
                <EuiCodeBlock fontSize="m" key={i} paddingSize="m">
                  {failure}
                </EuiCodeBlock>
              ))}
            </>
          </EuiAccordion>
        )}
      </>
    );
  }, [failureReason]);

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="failure" direction="column">
      <EuiFlexItem data-test-subj="emptyPromptContainer" grow={false}>
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          body={
            <EuiText
              color="subdued"
              css={css`
                word-wrap: break-word;
              `}
              data-test-subj="bodyText"
            >
              {Failures}
            </EuiText>
          }
          title={<h2 data-test-subj="failureTitle">{i18n.FAILURE_TITLE}</h2>}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiLink
          external={true}
          data-test-subj="learnMoreLink"
          href="https://www.elastic.co/guide/en/security/current/attack-discovery.html"
          target="_blank"
        >
          {i18n.LEARN_MORE}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Failure = React.memo(FailureComponent);
