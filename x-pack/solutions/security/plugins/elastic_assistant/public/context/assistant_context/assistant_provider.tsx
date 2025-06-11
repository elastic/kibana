import React, { createContext } from 'react';
import { i18n } from '@kbn/i18n';
import { AssistantProvider as ElasticAssistantProvider } from '@kbn/elastic-assistant';
import type { IToasts } from '@kbn/core/public';

import { useKibana } from '../../hooks/kibana/use_kibana';
import { useBasePath } from '../../hooks/kibana/use_base_path';
import { useAssistantAvailability } from '../../hooks/use_assistant_availability';
import useObservable from 'react-use/lib/useObservable';
import { useMigrateConversationsFromLocalStorage } from '../../hooks/migrate_conversations_from_local_storage/migrate_conversations_from_local_storage';
import { useCreateSecurityPrompts } from '../../hooks/create_security_prompts/create_security_prompts';
import { useAppToasts } from '../../hooks/toast/use_app_toasts';
import { useInferenceEnabled } from '../../hooks/inference_enabled/inference_enabled';
import { getComments } from '../../components/get_comments';
import { PROMPT_CONTEXTS } from '../../assets/prompt_contexts';

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
    useMigrateConversationsFromLocalStorage()
    useCreateSecurityPrompts()


    const signalIndexName = undefined//const { signalIndexName } = useSignalIndex();
    const alertsIndexPattern = signalIndexName ?? undefined;
    const toasts = useAppToasts() as unknown as IToasts; // useAppToasts is the current, non-deprecated method of getting the toasts service in the Security Solution, but it doesn't return the IToasts interface (defined by core)


    return (
        <ElasticAssistantProvider
            actionTypeRegistry={actionTypeRegistry}
            alertsIndexPattern={alertsIndexPattern}
            augmentMessageCodeBlocks={() => []} 
            assistantAvailability={assistantAvailability}
            assistantTelemetry={assistantTelemetry}
            docLinks={{ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }}
            basePath={basePath}
            basePromptContexts={Object.values(PROMPT_CONTEXTS)} 
            getComments={getComments({
                getActions$: elasticAssistantSharedState.comments.getActions$(),
            })}
            http={http}
            inferenceEnabled={inferenceEnabled}
            navigateToApp={navigateToApp}
            productDocBase={productDocBase}
            title={ASSISTANT_TITLE}
            toasts={toasts}
            currentAppId={currentAppId ?? 'securitySolutionUI'}
            userProfileService={userProfile}
            chrome={chrome}
        >
            {children}
        </ElasticAssistantProvider>
    )
}