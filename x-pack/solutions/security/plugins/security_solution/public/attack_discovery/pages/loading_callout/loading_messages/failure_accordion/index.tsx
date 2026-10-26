/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiCodeBlock } from '@elastic/eui';
import React, { useMemo } from 'react';

interface Props {
  failureReason: string | null | undefined;
}

const FailureAccordionComponent: React.FC<Props> = ({ failureReason }) => {
  const [firstFailure, ...restFailures] = useMemo(
    () => (failureReason != null ? failureReason.split('\n') : ''),
    [failureReason]
  );

  return (
    <>
      {restFailures.length > 0 ? (
        <EuiAccordion
          id="failureAccordion"
          buttonContent={firstFailure}
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
      ) : (
        <p>{firstFailure}</p>
      )}
    </>
  );
};

FailureAccordionComponent.displayName = 'FailureAccordion';

export const FailureAccordion = React.memo(FailureAccordionComponent);
