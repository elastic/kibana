export declare const formulas: {
    dockerContainerCpuUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerMemoryUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerNetworkRx: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerNetworkTx: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerDiskIORead: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerDiskIOWrite: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    k8sContainerCpuUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    k8sContainerMemoryUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
};
export type ContainerFormulas = typeof formulas;
