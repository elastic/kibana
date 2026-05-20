export interface CompositeSLOMember {
    sloId: string;
    sloName: string;
    groupBy: string | string[];
    instanceId?: string;
    weight: number;
}
export interface CreateCompositeSLOForm {
    name: string;
    description: string;
    members: CompositeSLOMember[];
    timeWindow: {
        duration: string;
        type: 'rolling';
    };
    objective: {
        target: number;
    };
    tags: string[];
}
