import { useKibana } from "../../context/typed_kibana_context/typed_kibana_context";

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