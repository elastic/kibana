import { StartServices } from "../../../types";
import { useKibana } from "../../context/typed_kibana_context/typed_kibana_context";

export const useToasts = (): StartServices['notifications']['toasts'] =>
    useKibana().services.notifications.toasts;