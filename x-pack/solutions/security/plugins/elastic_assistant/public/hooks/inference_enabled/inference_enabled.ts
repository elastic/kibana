import { useKibana } from "../kibana/use_kibana";

export const useInferenceEnabled = () => {
    const {
        triggersActionsUi: { actionTypeRegistry },
    } = useKibana().services;
    let inferenceEnabled = false;
    try {
        actionTypeRegistry.get('.inference');
        inferenceEnabled = true;
    } catch (e) {
        // swallow error
        // inferenceEnabled will be false
    }
    return inferenceEnabled;
}