/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { EuiLink, EuiIcon, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface LinkToAlertsRuleProps {
  onClick?: () => void;
  ['data-test-subj']: string;
  buttonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
}

export const CreateAlertRuleButton = ({
  onClick,
  ['data-test-subj']: dataTestSubj,
  buttonRef,
}: LinkToAlertsRuleProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    // eslint-disable-next-line @elastic/eui/require-href-for-link -- no href on purpose (visual link, semantic button)
    <EuiLink ref={buttonRef} data-test-subj={dataTestSubj} onClick={onClick}>
      <EuiIcon
        size="s"
        type="bell"
        aria-hidden="true"
        css={css`
          margin-inline-end: ${euiTheme.size.xs};
        `}
      />
      <FormattedMessage
        id="xpack.infra.infra.alerts.createAlertLink"
        defaultMessage="Create rule"
      />
    </EuiLink>
  );
};
