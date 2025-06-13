import { useMemo } from 'react';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';
import { useAssistantAvailability } from './use_assistant_availability';

export const useAssistantAvailabilitySharedState = () => {
    const assistantAvailability = useAssistantAvailability()
    const elasticAssistantSharedState = useKibana().services.elasticAssistantSharedState;

    useMemo(
        () => {
            elasticAssistantSharedState.assistantAvailability.setAssistantAvailability(assistantAvailability);
        },
        [elasticAssistantSharedState, assistantAvailability]
    );

}