/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import { ALERTZERO_APP_ID } from '@kbn/alertzero-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ESCALATIONS_OPEN_NOTE } from './translations';

/** Centered explainer with the small Alert Zero icon, shown in the Open section only when it is empty. */
export const EscalationsOpenNote: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana<CoreStart>();
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      gutterSize="s"
      responsive={false}
      css={css`
        padding-block: ${euiTheme.size.l};
      `}
      data-test-subj="alertZeroEscalationsOpenNote"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="sun" size="m" color="subdued" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" textAlign="center">
          <strong>{ESCALATIONS_OPEN_NOTE.emptyTitle}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          color="subdued"
          textAlign="center"
          css={css`
            max-inline-size: 420px;
          `}
        >
          <p>
            <FormattedMessage
              id="xpack.alertzero.escalationsPage.openNote.body"
              defaultMessage="Escalations start in Alert Zero. Open an investigation from the {alertZeroLink} and escalate it from there."
              values={{
                alertZeroLink: (
                  <EuiLink
                    href={application.getUrlForApp(ALERTZERO_APP_ID)}
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      void application.navigateToApp(ALERTZERO_APP_ID);
                    }}
                    data-test-subj="alertZeroEscalationsOpenNoteLink"
                  >
                    <FormattedMessage
                      id="xpack.alertzero.escalationsPage.openNote.linkText"
                      defaultMessage="Alert Zero page"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
