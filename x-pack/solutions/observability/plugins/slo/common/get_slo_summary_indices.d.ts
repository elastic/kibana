interface Props {
    useAllRemoteClusters: boolean;
    selectedRemoteClusters: string[];
    remoteClusters?: Array<{
        name: string;
        isConnected: boolean;
    }>;
}
/**
 * @returns the local SLO summary index or the remote cluster indices based on the settings.
 * If `useAllRemoteClusters` is false and no remote clusters are selected it returns only the local index.
 * If `useAllRemoteClusters` is true, it returns both the local index and a wildcard remote index.
 * If `useAllRemoteClusters` is false, it returns the local index and only the indices of the selected remote clusters that are connected.
 */
export declare function getSLOSummaryIndices({ useAllRemoteClusters, selectedRemoteClusters, remoteClusters, }: Props): string[];
export {};
