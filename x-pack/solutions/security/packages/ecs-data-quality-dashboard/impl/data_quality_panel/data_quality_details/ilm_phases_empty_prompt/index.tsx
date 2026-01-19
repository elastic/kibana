/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';

import {
  COLD_DESCRIPTION,
  FROZEN_DESCRIPTION,
  HOT_DESCRIPTION,
  UNMANAGED_DESCRIPTION,
  WARM_DESCRIPTION,
  HOT,
  WARM,
  FROZEN,
  COLD,
  UNMANAGED,
} from '../../translations';
import * as i18n from './translations';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    ul: css({
      textAlign: 'left',
    }),
    li: css({
      marginBottom: euiTheme.size.s,
      textAlign: 'left',
    }),
  };
};

const IlmPhasesEmptyPromptComponent: React.FC = () => {
  const styles = useStyles();
  const title = useMemo(() => <h2>{i18n.TITLE}</h2>, []);
  const body = useMemo(() => <p>{i18n.BODY}</p>, []);
  const footer = useMemo(
    () => (
      <div data-test-subj="ilmPhasesEmptyPrompt">
        <EuiTitle size="xxs">
          <h3>{i18n.ILM_PHASES_THAT_CAN_BE_CHECKED}</h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <ul css={styles.ul}>
          <li css={styles.li}>
            <strong>{HOT}</strong>
            {': '}
            {HOT_DESCRIPTION}
          </li>
          <li css={styles.li}>
            <strong>{WARM}</strong>
            {': '}
            {WARM_DESCRIPTION}
          </li>
          <li css={styles.li}>
            <strong>{UNMANAGED}</strong>
            {': '}
            {UNMANAGED_DESCRIPTION}
          </li>
        </ul>

        <EuiSpacer size="m" />

        <EuiTitle size="xxs">
          <h3>{i18n.ILM_PHASES_THAT_CANNOT_BE_CHECKED}</h3>
        </EuiTitle>

        <EuiText color="subdued" size="s">
          {i18n.THE_FOLLOWING_ILM_PHASES}
        </EuiText>

        <EuiSpacer size="s" />

        <ul css={styles.ul}>
          <li css={styles.li}>
            <strong>{COLD}</strong>
            {': '}
            {COLD_DESCRIPTION}
          </li>
          <li css={styles.li}>
            <strong>{FROZEN}</strong>
            {': '}
            {FROZEN_DESCRIPTION}
          </li>
        </ul>
      </div>
    ),
    [styles.li, styles.ul]
  );

  return <EuiEmptyPrompt body={body} footer={footer} title={title} />;
};

export const IlmPhasesEmptyPrompt = React.memo(IlmPhasesEmptyPromptComponent);
