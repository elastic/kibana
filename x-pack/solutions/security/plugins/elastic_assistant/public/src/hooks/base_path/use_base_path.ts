import { useKibana } from "../../context/typed_kibana_context/typed_kibana_context";

export const useBasePath = (): string => useKibana().services.http.basePath.get();