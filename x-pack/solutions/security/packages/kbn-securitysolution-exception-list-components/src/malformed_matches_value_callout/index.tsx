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
          defaultMessage="An entry uses {matches} with a value containing escape sequences (e.g. {escapedStar}, {escapedBackslash}). These will match literal characters, not wildcard patterns — for example {escapedStar} matches a literal asterisk. If you intended an exact match, consider using {is} instead."
          values={{
            matches: <strong>{'matches'}</strong>,
            is: <strong>{'is'}</strong>,
            escapedStar: <code>{'\\*'}</code>,
            escapedBackslash: <code>{'\\\\'}</code>,
          }}
        />
      </p>
    </EuiCallOut>
  );
};
