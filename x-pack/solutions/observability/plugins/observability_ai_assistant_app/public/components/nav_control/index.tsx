/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type ComponentProps, useEffect, useRef, useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiShowFor, EuiToolTip } from '@elastic/eui';
import type { EuiToolTip as EuiToolTipRef } from '@elastic/eui';
import { v4 } from 'uuid';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AIAssistantAppService } from '@kbn/ai-assistant';
import { useAIAssistantAppService, ChatFlyout, FlyoutPositionMode } from '@kbn/ai-assistant';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { useNavControlScreenContext } from '../../hooks/use_nav_control_screen_context';
import { SharedProviders } from '../../utils/shared_providers';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../../types';
import { useNavControlScope } from '../../hooks/use_nav_control_scope';
import { useLocalStorage } from '../../hooks/use_local_storage';

interface NavControlWithProviderDeps {
  appService: AIAssistantAppService;
  coreStart: CoreStart;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
  isServerless?: boolean;
}

export const NavControlWithProvider = ({
  appService,
  coreStart,
  pluginsStart,
  isServerless,
}: NavControlWithProviderDeps) => {
  return (
    <SharedProviders
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      service={appService}
      theme$={coreStart.theme.theme$}
    >
      <NavControl isServerless={isServerless} />
    </SharedProviders>
  );
};

export function NavControl({ isServerless }: { isServerless?: boolean }) {
  const service = useAIAssistantAppService();

  const {
    services: {
      application,
      http,
      notifications,
      plugins: {
        start: {
          observabilityAIAssistant: { ObservabilityAIAssistantChatServiceContext },
          aiAssistantManagementSelection,
        },
      },
    },
  } = useKibana();

  useNavControlScreenContext();
  useNavControlScope();

  const [flyoutSettings, setFlyoutSettings] = useLocalStorage(
    'observabilityAIAssistant.flyoutSettings',
    {
      mode: FlyoutPositionMode.OVERLAY,
      isOpen: false,
    }
  );

  // only open on mount when in docked mode
  const [isOpen, setIsOpen] = useState(() =>
    flyoutSettings.mode === FlyoutPositionMode.PUSH ? flyoutSettings.isOpen : false
  );

  const [hasBeenOpened, setHasBeenOpened] = useState(isOpen);
  const keyRef = useRef(v4());

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return hasBeenOpened
        ? service.start({ signal }).catch((error) => {
            notifications.toasts.addError(error, {
              title: i18n.translate(
                'xpack.observabilityAiAssistant.navControl.initFailureErrorTitle',
                {
                  defaultMessage: 'Failed to initialize Observability AI Assistant',
                }
              ),
            });

            setHasBeenOpened(false);
            setIsOpen(false);

            throw error;
          })
        : undefined;
    },
    [service, hasBeenOpened, notifications.toasts]
  );

  useEffect(() => {
    const conversationSubscription = service.conversations.predefinedConversation$.subscribe(() => {
      keyRef.current = v4();
      setHasBeenOpened(true);
      setFlyoutSettings((prev) => ({ ...prev, isOpen: true }));
      setIsOpen(true);
    });

    return () => {
      conversationSubscription.unsubscribe();
    };
  }, [service.conversations.predefinedConversation$, setFlyoutSettings]);

  useEffect(() => {
    const openChatSubscription = aiAssistantManagementSelection.openChat$.subscribe((selection) => {
      if (selection === AIAssistantType.Observability) {
        service.conversations.openNewConversation({ messages: [] });
        aiAssistantManagementSelection.completeOpenChat();
      }
    });

    return () => {
      openChatSubscription.unsubscribe();
    };
  }, [aiAssistantManagementSelection, service.conversations]);

  const { messages, title, hideConversationList } = useObservable(
    service.conversations.predefinedConversation$
  ) ?? {
    messages: [],
    title: undefined,
    hideConversationList: false,
  };

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Semicolon') {
        service.conversations.openNewConversation({
          messages: [],
        });
      }
    };

    window.addEventListener('keypress', keyboardListener);

    return () => {
      window.removeEventListener('keypress', keyboardListener);
    };
  }, [service.conversations]);

  // wraps EuiButton and EuiButtonIcon and accepts props for both
  const AiAssistantButton: React.FC<
    ComponentProps<typeof EuiButton> & ComponentProps<typeof EuiButtonIcon>
  > = (props) => (
    <>
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        {isServerless ? (
          <EuiButtonEmpty {...props} data-test-subj="observabilityAiAssistantAppNavControlButton" />
        ) : (
          <EuiButton {...props} data-test-subj="observabilityAiAssistantAppNavControlButton" />
        )}
      </EuiShowFor>
      <EuiShowFor sizes={['xs', 's']}>
        <EuiButtonIcon
          {...props}
          display={isServerless ? 'empty' : 'base'}
          data-test-subj="observabilityAiAssistantAppNavControlButtonIcon"
        />
      </EuiShowFor>
    </>
  );

  const tooltipRef = useRef<EuiToolTipRef | null>(null);
  const hideToolTip = () => tooltipRef.current?.hideToolTip();

  return (
    <>
      <EuiToolTip
        ref={tooltipRef}
        content={i18n.translate(
          'xpack.observabilityAiAssistant.navControl.openTheAIAssistantPopoverLabel',
          { defaultMessage: 'Keyboard shortcut Ctrl ;' }
        )}
        disableScreenReaderOutput
        onMouseOut={hideToolTip}
      >
        <AiAssistantButton
          aria-label={i18n.translate(
            'xpack.observabilityAiAssistant.navControl.assistantNavLinkAriaLabel',
            { defaultMessage: 'Open the AI Assistant' }
          )}
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
          {i18n.translate('xpack.observabilityAiAssistant.navControl.assistantNavLink', {
            defaultMessage: 'AI Assistant',
          })}
        </AiAssistantButton>
      </EuiToolTip>
      {chatService.value ? (
        <ObservabilityAIAssistantChatServiceContext.Provider value={chatService.value}>
          <ChatFlyout
            key={keyRef.current}
            isOpen={isOpen}
            initialMessages={messages}
            initialTitle={title ?? ''}
            initialFlyoutPositionMode={flyoutSettings.mode}
            onClose={() => {
              setFlyoutSettings((prev) => ({ ...prev, isOpen: false }));
              setIsOpen(false);
            }}
            onFlyoutPositionModeChange={(next) => {
              setFlyoutSettings((prev) => ({ ...prev, mode: next }));
            }}
            navigateToConversation={(conversationId?: string) => {
              application.navigateToUrl(
                http.basePath.prepend(
                  `/app/observabilityAIAssistant/conversations/${conversationId || ''}`
                )
              );
            }}
            hideConversationList={hideConversationList}
          />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      ) : undefined}
    </>
  );
}
