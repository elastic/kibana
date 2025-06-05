import { StartServices } from "../../types";
import { useKibana } from "./use_kibana";

export const useToasts = (): StartServices['notifications']['toasts'] =>
    useKibana().services.notifications.toasts;
  