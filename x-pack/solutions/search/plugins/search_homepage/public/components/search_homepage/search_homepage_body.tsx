/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';
import { ConversationsList } from './conversations_list';

export const SearchHomepageBody = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <KibanaPageTemplate.Section
      alignment="top"
      restrictWidth={true}
      grow
      paddingSize="none"
      css={css({ padding: `0 ${euiTheme.size.l}` })}
    >
      <ConversationsList />
    </KibanaPageTemplate.Section>
  );
};
