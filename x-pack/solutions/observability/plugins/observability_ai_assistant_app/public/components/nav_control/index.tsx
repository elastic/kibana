/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { v4 } from 'uuid';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AIAssistantAppService } from '@kbn/ai-assistant';
import { useAIAssistantAppService, ChatFlyout, FlyoutPositionMode } from '@kbn/ai-assistant';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
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
  iconOnly = false,
}: NavControlWithProviderDeps & { iconOnly?: boolean }) => {
  return (
    <SharedProviders
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      service={appService}
      theme$={coreStart.theme.theme$}
    >
      <NavControl isServerless={isServerless} iconOnly={iconOnly} />
    </SharedProviders>
  );
};

export function NavControl({
  isServerless,
  iconOnly = false,
}: {
  isServerless?: boolean;
  iconOnly?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const service = useAIAssistantAppService();

  const {
    services: {
      application,
      http,
      notifications,
      plugins: {
        start: {
          observabilityAIAssistant: { ObservabilityAIAssistantChatServiceContext },
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

  const EuiButtonBasicOrEmpty = isServerless ? EuiButtonEmpty : EuiButton;
  const ButtonComponent = iconOnly ? EuiButtonIcon : EuiButtonBasicOrEmpty;

  return (
    <>
      <EuiToolTip
        delay="long"
        // title="Kehyboard shortcut"
        content={i18n.translate(
          'xpack.observabilityAiAssistant.navControl.openTheAIAssistantPopoverLabel',
          { defaultMessage: 'Ctrl + ;' }
        )}
      >
        <div
          css={{
            position: 'relative',
            display: 'inline-block',
            overflow: 'hidden',
            // marginTop: '4px',
            borderRadius: '4px', // Match EUI button border radius
            '&:hover > div:first-of-type': {
              transform: iconOnly
                ? 'translateX(45px) translateY(40px) rotate(11deg)'
                : 'translateX(185px) translateY(85px) rotate(22deg)',
            },
          }}
        >
          <div
            css={{
              position: 'absolute',
              backgroundImage: 'linear-gradient(20deg, #0B64DD 18%, #48EFCF 70%)',
              height: iconOnly ? '100px' : '200px',
              width: iconOnly ? '100px' : '320px',
              top: iconOnly ? '-50px' : '-140px',
              left: iconOnly ? '-60px' : '-190px',
              borderRadius: '4px',
              zIndex: -1,
              transition: 'transform 0.8s ease',
              transform: 'translateX(0px)',
            }}
          />
          <ButtonComponent
            aria-label={i18n.translate(
              'xpack.observabilityAiAssistant.navControl.assistantNavLinkAriaLabel',
              { defaultMessage: 'Open the AI Assistant' }
            )}
            data-test-subj="observabilityAiAssistantAppNavControlButton"
            onClick={() => {
              service.conversations.openNewConversation({
                messages: [],
              });
            }}
            color="text"
            size="s"
            display={iconOnly ? 'empty' : undefined}
            iconType={() => <AssistantIcon multicolor={false} />}
            isLoading={chatService.loading}
            css={{
              position: 'relative',
              zIndex: 1,
              color: '#2b394f',
              backgroundColor: 'transparent !important',
              overflow: 'hidden',
              transition: 'color 0.3s ease',
              '&:hover': {
                backgroundColor: 'transparent !important',
                color: '#2b394f',
              },
              '&::before': {
                backgroundColor: 'transparent !important',
              },
            }}
          >
            {!iconOnly &&
              i18n.translate('xpack.observabilityAiAssistant.navControl.assistantNavLink', {
                defaultMessage: 'AI Assistant',
              })}
          </ButtonComponent>
        </div>
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
