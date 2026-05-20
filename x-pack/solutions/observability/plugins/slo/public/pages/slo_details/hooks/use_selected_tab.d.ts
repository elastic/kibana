import type { SloTabId } from '@kbn/deeplinks-observability';
export declare const useSelectedTab: () => {
    selectedTabId: SloTabId;
    setSelectedTabId: import("react").Dispatch<import("react").SetStateAction<SloTabId>>;
};
