/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SearchGettingStartedSectionHeading } from '../section_heading';

const AGENT_INSTALL_PROMPT = [
  'Fetch and run this remote script:',
  'curl -sSL https://raw.githubusercontent.com/wildemat/kibana/search-agent/src/platform/packages/shared/kbn-search-agent/install-agent.sh | sh',
  'Then help me get started with Elasticsearch.',
].join('\n');

const CURSOR_DEEPLINK_URL = `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(
  AGENT_INSTALL_PROMPT
)}`;

export const CursorAgentSection = () => {
  return (
    <>
      <SearchGettingStartedSectionHeading
        icon="sparkles"
        title={i18n.translate('xpack.gettingStarted.cursorAgent.title', {
          defaultMessage: 'Elasticsearch AI assistant',
        })}
        description={i18n.translate('xpack.gettingStarted.cursorAgent.description', {
          defaultMessage:
            'Install the Elasticsearch assistant into Cursor to get AI-powered help with building your search application.',
        })}
      />
      <EuiSpacer size="l" />
      <EuiButton
        href={CURSOR_DEEPLINK_URL}
        data-test-subj="cursorAgentOpenInCursorBtn"
        iconType="launch"
        target="_blank"
      >
        {i18n.translate('xpack.gettingStarted.cursorAgent.openInCursorButton', {
          defaultMessage: 'Open in Cursor',
        })}
      </EuiButton>
    </>
  );
};
