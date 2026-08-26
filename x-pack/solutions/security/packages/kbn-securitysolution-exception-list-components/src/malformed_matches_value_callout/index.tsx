/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { isOperator, matchesOperator } from '@kbn/securitysolution-list-utils';

export const MalformedMatchesValueCallout = () => {
  return (
    <EuiCallOut
      title={i18n.translate('exceptionList-components.malformedMatchesValueCallout.title', {
        defaultMessage: 'Please review your entries',
      })}
      iconType="warning"
      color="warning"
      size="s"
      data-test-subj="malformedMatchesValueCallout"
    >
      <p>
        <FormattedMessage
          id="exceptionList-components.malformedMatchesValueCallout.body"
          defaultMessage="An entry uses {matches} with a value containing escape sequences (e.g. {escapedStar}, {escapedQuestion}). These will {literalCharacters}, not wildcard patterns (for example {escapedStar2} matches a literal asterisk). If you intended an exact match, {changeOperator} to {is}."
          values={{
            matches: <strong>{matchesOperator.message}</strong>,
            is: <strong>{isOperator.message}</strong>,
            escapedStar: <code>{'\\*'}</code>,
            escapedStar2: <code>{'\\*'}</code>,
            escapedQuestion: <code>{'\\?'}</code>,
            literalCharacters: (
              <strong>
                {i18n.translate(
                  'exceptionList-components.malformedMatchesValueCallout.literalCharacters',
                  { defaultMessage: 'match literal characters' }
                )}
              </strong>
            ),
            changeOperator: (
              <strong>
                {i18n.translate(
                  'exceptionList-components.malformedMatchesValueCallout.changeOperator',
                  { defaultMessage: 'change the operator' }
                )}
              </strong>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};
