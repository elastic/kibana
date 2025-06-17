import { useEffect } from "react";
import { useKibana } from "../../common/lib/kibana";
import { useSignalIndex } from "../../detections/containers/detection_engine/alerts/use_signal_index";

export const useElasticAssistantSharedStateSignalIndex = () => {
    const {
        elasticAssistantSharedState
    } = useKibana().services;
    const { signalIndexName } = useSignalIndex();

    useEffect(() => {
        if (!signalIndexName) {
            return elasticAssistantSharedState.signalIndex.setSignalIndex(undefined);
        }
        return elasticAssistantSharedState.signalIndex.setSignalIndex(undefined);
    }, [signalIndexName, elasticAssistantSharedState]);

}