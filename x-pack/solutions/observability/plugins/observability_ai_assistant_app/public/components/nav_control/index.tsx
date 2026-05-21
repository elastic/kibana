/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { EuiShowFor, EuiToolTip, type EuiToolTipRef } from '@elastic/eui';
import { v4 } from 'uuid';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AIAssistantAppService } from '@kbn/ai-assistant';
import { useAIAssistantAppService, ChatFlyout, FlyoutPositionMode } from '@kbn/ai-assistant';
import { isMac } from '@kbn/shared-ux-utility';
import { AiButton } from '@kbn/shared-ux-ai-components';
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<EuiToolTipRef>(null);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      const hasModifier = isMac ? event.metaKey : event.ctrlKey;
      if (hasModifier && (event.code === 'Semicolon' || event.key === ';')) {
        event.preventDefault();
        service.conversations.openNewConversation({
          messages: [],
        });
      }
      if (event.key === 'Escape' && isOpen) {
        setTooltipVisible(true);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', keyboardListener);

    return () => {
      window.removeEventListener('keydown', keyboardListener);
    };
  }, [service.conversations, isOpen, setFlyoutSettings, setIsOpen, setTooltipVisible]);

  const buttonLabel = i18n.translate('xpack.observabilityAiAssistant.navControl.assistantNavLink', {
    defaultMessage: 'AI Assistant',
  });

  const openAIAssistantLabel = i18n.translate(
    'xpack.observabilityAiAssistant.navControl.openAIAssistantLabel',
    { defaultMessage: 'Open the AI Assistant' }
  );

  const shortcutLabel = i18n.translate(
    'xpack.observabilityAiAssistant.navControl.openTheAIAssistantKeyboardShortcutLabel',
    {
      values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
      defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
    }
  );

  const fullTooltipContent = (
    <div style={{ textAlign: 'center' }}>
      <span>{openAIAssistantLabel}</span>
      <br />
      <span>{shortcutLabel}</span>
    </div>
  );

  const handleClick = () => {
    tooltipRef.current?.hideToolTip();
    setTooltipVisible(false);
    if (isOpen) {
      setFlyoutSettings((prev) => ({ ...prev, isOpen: false }));
      setIsOpen(false);
    } else {
      service.conversations.openNewConversation({
        messages: [],
      });
    }
  };
  const variant = isOpen ? 'accent' : 'base';
  const showTooltip = !isOpen && tooltipVisible;
  const textButton = (
    <AiButton
      buttonRef={buttonRef}
      variant={variant}
      size="s"
      iconType="aiAssistantLogo"
      data-test-subj="observabilityAiAssistantAppNavControlButton"
      isLoading={chatService.loading}
      onClick={handleClick}
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
    >
      {buttonLabel}
    </AiButton>
  );

  const iconButton = (
    <AiButton
      buttonRef={buttonRef}
      iconOnly
      variant={variant}
      size="s"
      iconType="aiAssistantLogo"
      aria-label={openAIAssistantLabel}
      data-test-subj="observabilityAiAssistantAppNavControlButtonIcon"
      isLoading={chatService.loading}
      onClick={handleClick}
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
    />
  );
  return (
    <>
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        {showTooltip ? (
          <EuiToolTip content={shortcutLabel} ref={tooltipRef}>
            {textButton}
          </EuiToolTip>
        ) : (
          textButton
        )}
      </EuiShowFor>

      <EuiShowFor sizes={['xs', 's']}>
        {showTooltip ? (
          <EuiToolTip content={fullTooltipContent} ref={tooltipRef}>
            {iconButton}
          </EuiToolTip>
        ) : (
          iconButton
        )}
      </EuiShowFor>
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
              setTooltipVisible(true);
              if (document.activeElement?.matches(':focus-visible')) {
                buttonRef.current?.focus();
              }
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
