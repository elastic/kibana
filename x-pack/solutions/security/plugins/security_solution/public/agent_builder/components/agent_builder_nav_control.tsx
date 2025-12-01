/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { EuiToolTip, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { internalNamespaces } from '@kbn/onechat-common/base/namespaces';
import { useKibana } from '../../common/lib/kibana/use_kibana';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const TOOLTIP_CONTENT = i18n.translate('xpack.securitySolution.agentBuilder.navControl.tooltip', {
  values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
  defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
});

const LINK_LABEL = i18n.translate('xpack.securitySolution.agentBuilder.navControl.label', {
  defaultMessage: 'Agent Builder',
});

export function AgentBuilderNavControl() {
  const { chrome, onechat } = useKibana().services;
  const [chromeStyle, setChromeStyle] = useState<ChromeStyle | undefined>(undefined);

  useEffect(() => {
    if (!chrome) return;
    const subscription = chrome.getChromeStyle$().subscribe(setChromeStyle);
    return () => subscription.unsubscribe();
  }, [chrome]);

  const openFlyout = useCallback(() => {
    if (!onechat?.openConversationFlyout) {
      return;
    }

    // Use 'security' as sessionTag to match the pattern used in use_agent_builder_attachment
    // The flyout will automatically restore the last conversation if it exists via the persisted conversation mechanism
    // Setting newConversation: false allows the flyout to restore the last conversation if it exists
    onechat.openConversationFlyout({
      newConversation: false,
      sessionTag: 'security',
      agentId: `${internalNamespaces.security}.default`,
    });
  }, [onechat]);

  if (!chromeStyle) {
    return null;
  }

  const EuiButtonBasicOrEmpty = chromeStyle === 'project' ? EuiButtonEmpty : EuiButton;

  return (
    <EuiToolTip content={TOOLTIP_CONTENT}>
      <EuiButtonBasicOrEmpty
        onClick={openFlyout}
        size="s"
        iconType="machineLearningApp"
        data-test-subj="agentBuilderNavControl"
      >
        {LINK_LABEL}
      </EuiButtonBasicOrEmpty>
    </EuiToolTip>
  );
}
