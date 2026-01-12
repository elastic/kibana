/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { v4 } from 'uuid';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { useAIAssistantAppService, ChatFlyout } from '@kbn/ai-assistant';
import { useKibana } from '@kbn/ai-assistant/src/hooks/use_kibana';
import type { AIAssistantPluginStartDependencies } from '@kbn/ai-assistant/src/types';
import { EuiErrorBoundary } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { isMac } from '@kbn/shared-ux-utility';
interface NavControlWithProviderDeps {
  coreStart: CoreStart;
  pluginsStart: AIAssistantPluginStartDependencies;
}

export const NavControlWithProvider = ({ coreStart, pluginsStart }: NavControlWithProviderDeps) => {
  return (
    <EuiErrorBoundary>
      <KibanaThemeProvider theme={coreStart.theme}>
        <KibanaContextProvider
          services={{
            ...coreStart,
            ...pluginsStart,
          }}
        >
          <RedirectAppLinks coreStart={coreStart}>
            <coreStart.i18n.Context>
              <NavControl />
            </coreStart.i18n.Context>
          </RedirectAppLinks>
        </KibanaContextProvider>
      </KibanaThemeProvider>
    </EuiErrorBoundary>
  );
};

export function NavControl() {
  const service = useAIAssistantAppService();

  const {
    services: { notifications, observabilityAIAssistant },
  } = useKibana();

  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return hasBeenOpened
        ? service.start({ signal }).catch((error) => {
            notifications?.toasts.addError(error, {
              title: i18n.translate('xpack.searchAssistant.navControl.initFailureErrorTitle', {
                defaultMessage: 'Failed to initialize AI Assistant',
              }),
            });

            setHasBeenOpened(false);
            setIsOpen(false);

            throw error;
          })
        : undefined;
    },
    [service, hasBeenOpened, notifications?.toasts]
  );

  const [isOpen, setIsOpen] = useState(false);

  const keyRef = useRef(v4());

  useEffect(() => {
    const conversationSubscription = service.conversations.predefinedConversation$.subscribe(() => {
      keyRef.current = v4();
      setHasBeenOpened(true);
      setIsOpen(true);
    });

    return () => {
      conversationSubscription.unsubscribe();
    };
  }, [service.conversations.predefinedConversation$]);

  const { messages, title } = useObservable(service.conversations.predefinedConversation$) ?? {
    messages: [],
    title: undefined,
  };
  const tooltipRef = useRef<EuiToolTip | null>(null);
  const hideToolTip = () => tooltipRef.current?.hideToolTip();

  return (
    <>
      <EuiToolTip content={buttonLabel} ref={tooltipRef} onMouseOut={hideToolTip}>
        <EuiButtonEmpty
          aria-label={buttonLabel}
          data-test-subj="AiAssistantAppNavControlButton"
          onClick={() => {
            hideToolTip();
            service.conversations.openNewConversation({
              messages: [],
            });
          }}
          color="primary"
          size="s"
          iconType={AssistantIcon}
          isLoading={chatService.loading}
        >
          {i18n.translate('xpack.searchAssistant.navControl.assistantNavLink', {
            defaultMessage: 'AI Assistant',
          })}
        </EuiButtonEmpty>
      </EuiToolTip>
      {chatService.value &&
      Boolean(observabilityAIAssistant?.ObservabilityAIAssistantChatServiceContext) ? (
        <observabilityAIAssistant.ObservabilityAIAssistantChatServiceContext.Provider
          value={chatService.value}
        >
          <ChatFlyout
            key={keyRef.current}
            isOpen={isOpen}
            initialMessages={messages}
            initialTitle={title ?? ''}
            onClose={() => {
              setIsOpen(false);
            }}
          />
        </observabilityAIAssistant.ObservabilityAIAssistantChatServiceContext.Provider>
      ) : undefined}
    </>
  );
}

const buttonLabel = i18n.translate(
  'xpack.searchAssistant.navControl.openTheAIAssistantPopoverLabel',
  {
    defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
    values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
  }
);
