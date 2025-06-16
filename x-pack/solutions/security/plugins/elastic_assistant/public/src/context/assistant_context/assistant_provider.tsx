import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ClientMessage, AssistantProvider as ElasticAssistantProvider } from '@kbn/elastic-assistant';
import type { IToasts } from '@kbn/core/public';
import { getComments } from '../../components/get_comments'
import useObservable from 'react-use/lib/useObservable';
import { useMigrateConversationsFromLocalStorage } from '../../hooks/migrate_conversations_from_local_storage/use_migrate_conversations_from_local_storage';
import { useKibana } from '../typed_kibana_context/typed_kibana_context';
import { useInferenceEnabled } from '../../hooks/inference_enabled/use_inference_enabled';
import { useAppToasts } from '../../hooks/toasts/use_app_toasts';
import { useAssistantAvailability } from '../../hooks/assistant_availability/use_assistant_availability';
import { useBasePath } from '../../hooks/base_path/use_base_path';
import { CommentActionsMounter } from '../../components/comment_actions/comment_actions_mounter';
import { useAssistantContextValue } from '@kbn/elastic-assistant/impl/assistant_context';
import { AugmentMessageCodeBlocks } from '@kbn/elastic-assistant-shared-state';
const ASSISTANT_TITLE = i18n.translate('xpack.securitySolution.assistant.title', {
    defaultMessage: 'Elastic AI Assistant',
});

/**
 * This component configures the Elastic AI Assistant context provider for the Security Solution app.
 */
export function AssistantProvider({
    children,
}: {
    children: React.ReactElement;
}) {
    const {
        application: { navigateToApp, currentAppId$ },
        http,
        triggersActionsUi: { actionTypeRegistry },
        docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
        userProfile,
        chrome,
        productDocBase,
        elasticAssistantSharedState
    } = useKibana().services;

    const inferenceEnabled = useInferenceEnabled();

    const basePath = useBasePath()
    const assistantAvailability = useAssistantAvailability();

    const assistantTelemetry = undefined // useAssistantTelemetry();
    const currentAppId = useObservable(currentAppId$, '');
    const promptContext = useObservable(elasticAssistantSharedState.promptContexts.getPromptContext$(), {});
    const [augmentMessageCodeBlocks, setAugmentMessageCodeBlocks] = useState<AugmentMessageCodeBlocks>(()=>()=>[])

    useEffect(() => {
        elasticAssistantSharedState.augmentMessageCodeBlocks.getAugmentMessageCodeBlocks$().subscribe((x)=>{
            setAugmentMessageCodeBlocks(()=>x)
        })
    }, [elasticAssistantSharedState.augmentMessageCodeBlocks.getAugmentMessageCodeBlocks$]);

    useMigrateConversationsFromLocalStorage()

    const signalIndexName = undefined//const { signalIndexName } = useSignalIndex();
    const alertsIndexPattern = signalIndexName ?? undefined;
    const toasts = useAppToasts() as unknown as IToasts; // useAppToasts is the current, non-deprecated method of getting the toasts service in the Security Solution, but it doesn't return the IToasts interface (defined by core)

    const memoizedCommentActionsMounter = useCallback((args: { message: ClientMessage }) => {
        return <CommentActionsMounter message={args.message} getActions$={elasticAssistantSharedState.comments.getActions$()} />;
    }, [elasticAssistantSharedState.comments.getActions$()]);

    const memoizedGetComments = useMemo(() => {
        return getComments({
            CommentActions: memoizedCommentActionsMounter,
        })
    }, [memoizedCommentActionsMounter]);

    const assistantContextValue = useAssistantContextValue({
        actionTypeRegistry: actionTypeRegistry,
        alertsIndexPattern: alertsIndexPattern,
        augmentMessageCodeBlocks,
        assistantAvailability: assistantAvailability,
        assistantTelemetry: assistantTelemetry,
        docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
        basePath: basePath,
        basePromptContexts: Object.values(promptContext),
        getComments: memoizedGetComments,
        http: http,
        inferenceEnabled: inferenceEnabled,
        navigateToApp: navigateToApp,
        productDocBase: productDocBase,
        title: ASSISTANT_TITLE,
        toasts: toasts,
        currentAppId: currentAppId ?? 'securitySolutionUI',
        userProfileService: userProfile,
        chrome: chrome,
    });

    useEffect(() => {
        elasticAssistantSharedState.assistantContextValue.setAssistantContextValue(assistantContextValue)
    }, [assistantContextValue])

    return (
        <ElasticAssistantProvider
            value={assistantContextValue}
        >
            {children}
        </ElasticAssistantProvider>
    )
}