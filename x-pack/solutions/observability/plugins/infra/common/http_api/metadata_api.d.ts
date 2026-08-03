import * as rt from 'io-ts';
export declare const InfraMetadataRequestRT: rt.TypeC<{
    nodeId: rt.StringC;
    nodeType: rt.KeyofC<{
        host: null;
        pod: null;
        container: null;
        awsEC2: null;
        awsS3: null;
        awsSQS: null;
        awsRDS: null;
    }>;
    sourceId: rt.StringC;
    timeRange: rt.TypeC<{
        from: rt.NumberC;
        to: rt.NumberC;
    }>;
}>;
export declare const InfraMetadataFeatureRT: rt.TypeC<{
    name: rt.StringC;
    source: rt.StringC;
}>;
export declare const InfraMetadataOSRT: rt.PartialC<{
    codename: rt.StringC;
    family: rt.StringC;
    kernel: rt.StringC;
    name: rt.StringC;
    platform: rt.StringC;
    version: rt.StringC;
    build: rt.StringC;
}>;
export declare const InfraMetadataHostRT: rt.PartialC<{
    name: rt.StringC;
    hostname: rt.StringC;
    id: rt.StringC;
    ip: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    mac: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
    os: rt.PartialC<{
        codename: rt.StringC;
        family: rt.StringC;
        kernel: rt.StringC;
        name: rt.StringC;
        platform: rt.StringC;
        version: rt.StringC;
        build: rt.StringC;
    }>;
    architecture: rt.StringC;
    containerized: rt.BooleanC;
}>;
export declare const InfraMetadataContainerRT: rt.PartialC<{
    name: rt.StringC;
    id: rt.StringC;
    runtime: rt.StringC;
    image: rt.PartialC<{
        name: rt.StringC;
    }>;
}>;
export declare const InfraMetadataInstanceRT: rt.PartialC<{
    id: rt.StringC;
    name: rt.StringC;
}>;
export declare const InfraMetadataAccountRT: rt.PartialC<{
    id: rt.StringC;
    name: rt.StringC;
}>;
export declare const InfraMetadataProjectRT: rt.PartialC<{
    id: rt.StringC;
}>;
export declare const InfraMetadataMachineRT: rt.PartialC<{
    interface: rt.StringC;
    type: rt.StringC;
}>;
export declare const InfraMetadataCloudRT: rt.PartialC<{
    instance: rt.PartialC<{
        id: rt.StringC;
        name: rt.StringC;
    }>;
    provider: rt.StringC;
    account: rt.PartialC<{
        id: rt.StringC;
        name: rt.StringC;
    }>;
    availability_zone: rt.StringC;
    project: rt.PartialC<{
        id: rt.StringC;
    }>;
    machine: rt.PartialC<{
        interface: rt.StringC;
        type: rt.StringC;
    }>;
    region: rt.StringC;
    imageId: rt.StringC;
}>;
export declare const InfraMetadataAgentRT: rt.PartialC<{
    id: rt.StringC;
    version: rt.StringC;
    policy: rt.StringC;
}>;
export declare const InfraMetadataResourceRT: rt.PartialC<{
    attributes: rt.PartialC<{
        host: rt.PartialC<{
            ip: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            name: rt.StringC;
            mac: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        }>;
        agent: rt.PartialC<{}>;
        cloud: rt.PartialC<{
            provider: rt.StringC;
            resource_id: rt.StringC;
        }>;
        os: rt.PartialC<{
            name: rt.StringC;
            version: rt.StringC;
        }>;
    }>;
}>;
export declare const InfraMetadataInfoRT: rt.PartialC<{
    cloud: rt.PartialC<{
        instance: rt.PartialC<{
            id: rt.StringC;
            name: rt.StringC;
        }>;
        provider: rt.StringC;
        account: rt.PartialC<{
            id: rt.StringC;
            name: rt.StringC;
        }>;
        availability_zone: rt.StringC;
        project: rt.PartialC<{
            id: rt.StringC;
        }>;
        machine: rt.PartialC<{
            interface: rt.StringC;
            type: rt.StringC;
        }>;
        region: rt.StringC;
        imageId: rt.StringC;
    }>;
    host: rt.PartialC<{
        name: rt.StringC;
        hostname: rt.StringC;
        id: rt.StringC;
        ip: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        mac: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        os: rt.PartialC<{
            codename: rt.StringC;
            family: rt.StringC;
            kernel: rt.StringC;
            name: rt.StringC;
            platform: rt.StringC;
            version: rt.StringC;
            build: rt.StringC;
        }>;
        architecture: rt.StringC;
        containerized: rt.BooleanC;
    }>;
    container: rt.PartialC<{
        name: rt.StringC;
        id: rt.StringC;
        runtime: rt.StringC;
        image: rt.PartialC<{
            name: rt.StringC;
        }>;
    }>;
    agent: rt.PartialC<{
        id: rt.StringC;
        version: rt.StringC;
        policy: rt.StringC;
    }>;
    '@timestamp': rt.StringC;
}>;
export declare const InfraMetadataFieldsRT: rt.PartialC<{
    fields: rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>, rt.NullC, rt.UndefinedC]>>;
}>;
export declare const InfraMetadataInfoResponseRT: rt.PartialC<{
    cloud: rt.PartialC<{
        instance: rt.PartialC<{
            id: rt.StringC;
            name: rt.StringC;
        }>;
        provider: rt.StringC;
        account: rt.PartialC<{
            id: rt.StringC;
            name: rt.StringC;
        }>;
        availability_zone: rt.StringC;
        project: rt.PartialC<{
            id: rt.StringC;
        }>;
        machine: rt.PartialC<{
            interface: rt.StringC;
            type: rt.StringC;
        }>;
        region: rt.StringC;
        imageId: rt.StringC;
    }>;
    host: rt.PartialC<{
        name: rt.StringC;
        hostname: rt.StringC;
        id: rt.StringC;
        ip: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        mac: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
        os: rt.PartialC<{
            codename: rt.StringC;
            family: rt.StringC;
            kernel: rt.StringC;
            name: rt.StringC;
            platform: rt.StringC;
            version: rt.StringC;
            build: rt.StringC;
        }>;
        architecture: rt.StringC;
        containerized: rt.BooleanC;
    }>;
    container: rt.PartialC<{
        name: rt.StringC;
        id: rt.StringC;
        runtime: rt.StringC;
        image: rt.PartialC<{
            name: rt.StringC;
        }>;
    }>;
    agent: rt.PartialC<{
        id: rt.StringC;
        version: rt.StringC;
        policy: rt.StringC;
    }>;
    resource: rt.PartialC<{
        attributes: rt.PartialC<{
            host: rt.PartialC<{
                ip: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
                name: rt.StringC;
                mac: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            }>;
            agent: rt.PartialC<{}>;
            cloud: rt.PartialC<{
                provider: rt.StringC;
                resource_id: rt.StringC;
            }>;
            os: rt.PartialC<{
                name: rt.StringC;
                version: rt.StringC;
            }>;
        }>;
    }>;
    timestamp: rt.StringC;
}>;
export declare const InfraMetadataRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    name: rt.StringC;
    features: rt.ArrayC<rt.TypeC<{
        name: rt.StringC;
        source: rt.StringC;
    }>>;
}>, rt.PartialC<{
    info: rt.PartialC<{
        cloud: rt.PartialC<{
            instance: rt.PartialC<{
                id: rt.StringC;
                name: rt.StringC;
            }>;
            provider: rt.StringC;
            account: rt.PartialC<{
                id: rt.StringC;
                name: rt.StringC;
            }>;
            availability_zone: rt.StringC;
            project: rt.PartialC<{
                id: rt.StringC;
            }>;
            machine: rt.PartialC<{
                interface: rt.StringC;
                type: rt.StringC;
            }>;
            region: rt.StringC;
            imageId: rt.StringC;
        }>;
        host: rt.PartialC<{
            name: rt.StringC;
            hostname: rt.StringC;
            id: rt.StringC;
            ip: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            mac: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
            os: rt.PartialC<{
                codename: rt.StringC;
                family: rt.StringC;
                kernel: rt.StringC;
                name: rt.StringC;
                platform: rt.StringC;
                version: rt.StringC;
                build: rt.StringC;
            }>;
            architecture: rt.StringC;
            containerized: rt.BooleanC;
        }>;
        container: rt.PartialC<{
            name: rt.StringC;
            id: rt.StringC;
            runtime: rt.StringC;
            image: rt.PartialC<{
                name: rt.StringC;
            }>;
        }>;
        agent: rt.PartialC<{
            id: rt.StringC;
            version: rt.StringC;
            policy: rt.StringC;
        }>;
        resource: rt.PartialC<{
            attributes: rt.PartialC<{
                host: rt.PartialC<{
                    ip: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
                    name: rt.StringC;
                    mac: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
                }>;
                agent: rt.PartialC<{}>;
                cloud: rt.PartialC<{
                    provider: rt.StringC;
                    resource_id: rt.StringC;
                }>;
                os: rt.PartialC<{
                    name: rt.StringC;
                    version: rt.StringC;
                }>;
            }>;
        }>;
        timestamp: rt.StringC;
    }>;
    hasSystemIntegration: rt.BooleanC;
}>]>;
export type InfraMetadata = rt.TypeOf<typeof InfraMetadataRT>;
export type InfraMetadataFields = rt.TypeOf<typeof InfraMetadataFieldsRT>;
export type InfraMetadataRequest = rt.TypeOf<typeof InfraMetadataRequestRT>;
export type InfraMetadataFeature = rt.TypeOf<typeof InfraMetadataFeatureRT>;
export type InfraMetadataInfo = rt.TypeOf<typeof InfraMetadataInfoRT>;
export type InfraMetadataCloud = rt.TypeOf<typeof InfraMetadataCloudRT>;
export type InfraMetadataInstance = rt.TypeOf<typeof InfraMetadataInstanceRT>;
export type InfraMetadataProject = rt.TypeOf<typeof InfraMetadataProjectRT>;
export type InfraMetadataMachine = rt.TypeOf<typeof InfraMetadataMachineRT>;
export type InfraMetadataHost = rt.TypeOf<typeof InfraMetadataHostRT>;
export type InfraMetadataContainer = rt.TypeOf<typeof InfraMetadataContainerRT>;
export type InfraMetadataOS = rt.TypeOf<typeof InfraMetadataOSRT>;
