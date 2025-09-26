/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { css } from '@emotion/react';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { v4 } from 'uuid';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AIAssistantAppService } from '@kbn/ai-assistant';
import { useAIAssistantAppService, ChatFlyout, FlyoutPositionMode } from '@kbn/ai-assistant';
import {
  SparklesAnim,
  sparklesMaskDataUri,
} from '@kbn/elastic-assistant/impl/assistant_context/assets/sparkles_anim';
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

// Single gradient source - change once, all variants update
const CTA_GRAD = 'linear-gradient(135deg, #0B64DD 0%, #48EFCF 100%)';

export const buttonStyles = css`
  /* Primary (EuiButton): gradient background + white text/icon */
  &.euiButton {
    background-image: var(--cta-grad, ${CTA_GRAD}) !important;
    color: white !important;
    border: none !important;

    &:hover {
      background-image: var(--cta-grad, ${CTA_GRAD}) !important;
      color: white !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(11, 100, 221, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }

  /* Secondary (EuiButtonEmpty): gradient border + gradient text/icon */
  &.euiButtonEmpty {
    background: transparent !important;
    border: 2px solid transparent !important;
    background-clip: padding-box !important;
    position: relative !important;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--cta-grad, ${CTA_GRAD});
      border-radius: inherit;
      padding: 2px;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: xor;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
    }

    color: transparent !important;
    background-image: var(--cta-grad, ${CTA_GRAD}) !important;
    background-clip: text !important;
    -webkit-background-clip: text !important;

    &:hover {
      color: transparent !important;
      background-image: var(--cta-grad, ${CTA_GRAD}) !important;
      background-clip: text !important;
      -webkit-background-clip: text !important;
      transform: translateY(-1px);
    }
  }

  /* Icon-only (EuiButtonIcon): square gradient tile with white icon */
  &.euiButtonIcon {
    background: transparent !important;
    border: none !important;
    position: relative !important;

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 32px;
      height: 32px;
      background: var(--cta-grad, ${CTA_GRAD});
      border-radius: 8px;
      transform: translate(-50%, -50%);
      z-index: -1;
      transition: transform 0.2s ease;
    }

    &:hover::before {
      transform: translate(-50%, -50%) scale(1.1);
    }

    color: white !important;

    &:hover {
      color: white !important;
    }
  }

  /* Icon masking for all variants */
  .euiButtonContent__icon {
    width: 24px !important;
    height: 24px !important;
    mask: ${sparklesMaskDataUri} !important;
    -webkit-mask: ${sparklesMaskDataUri} !important;
    mask-size: contain !important;
    -webkit-mask-size: contain !important;
    mask-repeat: no-repeat !important;
    -webkit-mask-repeat: no-repeat !important;
    mask-position: center !important;
    -webkit-mask-position: center !important;
    background: var(--cta-grad, ${CTA_GRAD}) !important;
    background-clip: padding-box !important;
    -webkit-background-clip: padding-box !important;
  }

  /* Hide the SVG paint but keep DOM/a11y */
  .gIcon {
    visibility: hidden;
  }

  /* Motion safety */
  @media (prefers-reduced-motion: reduce) {
    &,
    &::before,
    .euiButtonContent__icon {
      transition: none !important;
    }
  }
`;

export function NavControl({
  isServerless,
  iconOnly = false,
}: {
  isServerless?: boolean;
  iconOnly?: boolean;
}) {
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
      <style>{`:root { --cta-grad: ${CTA_GRAD}; }`}</style>
      <EuiToolTip
        delay="long"
        // title="Kehyboard shortcut"
        content={i18n.translate(
          'xpack.observabilityAiAssistant.navControl.openTheAIAssistantPopoverLabel',
          { defaultMessage: 'Ctrl + ;' }
        )}
      >
        <div>
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
            iconType={SparklesAnim}
            css={buttonStyles}
            isLoading={chatService.loading}
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
