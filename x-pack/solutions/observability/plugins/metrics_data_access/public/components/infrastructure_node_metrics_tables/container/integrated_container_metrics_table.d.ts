import React from 'react';
import type { IntegratedNodeMetricsTableProps } from '../shared';
type ContainerIntegratedProps = IntegratedNodeMetricsTableProps & {
    isK8sContainer?: boolean;
};
declare function ContainerMetricsTableWithProviders({ timerange, kuery, sourceId, isOtel, isK8sContainer, metricsClient, ...coreProvidersProps }: ContainerIntegratedProps): React.JSX.Element;
export default ContainerMetricsTableWithProviders;
