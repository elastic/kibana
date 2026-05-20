export type TopologyDirection = 'downstream' | 'upstream' | 'both';
export interface ServiceTopologyNode {
    'service.name': string;
    'agent.name'?: string;
}
export interface ExternalNode {
    'span.destination.service.resource': string;
    'span.type': string;
    'span.subtype': string;
}
export interface ConnectionMetrics {
    errorRate?: number;
    latencyMs?: number;
    throughputPerMin?: number;
}
export interface ServiceTopologyConnection {
    source: ServiceTopologyNode | ExternalNode;
    target: ServiceTopologyNode | ExternalNode;
    metrics: ConnectionMetrics | undefined;
}
export interface ServiceTopologyResponse {
    connections: ServiceTopologyConnection[];
}
export interface ConnectionWithKey extends ServiceTopologyConnection {
    _key: string;
    _sourceName: string;
    _dependencyName: string;
}
