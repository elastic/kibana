import type { TabId } from '../types';
export declare const useTabId: () => {
    getUrlTabId: () => string | null;
    setUrlTabId: (tabId: TabId, overrideSearchState?: boolean, newSearchState?: Record<string, string>) => void;
};
