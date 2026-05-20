import type { SLODefinition } from '../../../domain/models/slo';
export declare const getGroupBy: (slo: SLODefinition) => {
    'service.name': {
        terms: {
            field: string;
            missing_bucket: boolean;
        };
    };
    'service.environment': {
        terms: {
            field: string;
            missing_bucket: boolean;
        };
    };
    'transaction.name': {
        terms: {
            field: string;
            missing_bucket: boolean;
        };
    };
    'transaction.type': {
        terms: {
            field: string;
            missing_bucket: boolean;
        };
    };
    'observer.geo.name': {
        terms: {
            field: string;
            missing_bucket: boolean;
        };
    };
    'observer.name': {
        terms: {
            field: string;
            missing_bucket: boolean;
        };
    };
    'monitor.config_id': {
        terms: {
            field: string;
            missing_bucket: boolean;
        };
    };
    'monitor.name': {
        terms: {
            field: string;
            missing_bucket: boolean;
        };
    };
    'slo.id': {
        terms: {
            field: string;
        };
    };
    'slo.revision': {
        terms: {
            field: string;
        };
    };
    'slo.instanceId': {
        terms: {
            field: string;
        };
    };
};
