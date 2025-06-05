import { useKibana } from "./use_kibana";

export const useBasePath = (): string => useKibana().services.http.basePath.get();