/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import uuid from 'uuid';

export function createServiceDependencyDocs({
  time,
  service,
  agentName,
  resource,
  responseTime,
  outcome,
  span,
  to,
}: {
  time: number;
  resource: string;
  responseTime: {
    count: number;
    sum: number;
  };
  service: {
    name: string;
    environment?: string;
  };
  agentName: string;
  span: {
    type: string;
    subtype: string;
  };
  outcome: 'success' | 'failure' | 'unknown';
  to?: {
    service: {
      name: string;
      environment?: string;
    };
    agentName: string;
  };
}) {
  const spanId = uuid.v4();

  return [
    {
      processor: {
        event: 'metric' as const,
      },
      '@timestamp': new Date(time).toISOString(),
      service,
      agent: {
        name: agentName,
      },
      event: {
        outcome,
      },
      span: {
        destination: {
          service: {
            resource,
            response_time: {
              sum: {
                us: responseTime.sum,
              },
              count: responseTime.count,
            },
          },
        },
      },
    },
    {
      processor: {
        event: 'span' as const,
      },
      '@timestamp': new Date(time).toISOString(),
      service,
      agent: {
        name: agentName,
      },
      event: {
        outcome,
      },
      span: {
        destination: {
          service: {
            resource,
          },
        },
        id: spanId,
        type: span.type,
        subtype: span.subtype,
      },
    },
    ...(to
      ? [
          {
            processor: {
              event: 'transaction' as const,
            },
            '@timestamp': new Date(time + 1).toISOString(),
            event: {
              outcome: 'unknown',
            },
            parent: {
              id: spanId,
            },
            service: to.service,
            agent: {
              name: to.agentName,
            },
          },
        ]
      : []),
  ];
}

export const apmDependenciesMapping: MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    event: {
      dynamic: false,
      properties: {
        outcome: {
          type: 'keyword',
        },
      },
    },
    agent: {
      dynamic: false,
      properties: {
        name: {
          type: 'keyword',
        },
      },
    },
    service: {
      dynamic: false,
      properties: {
        name: {
          type: 'keyword',
        },
        environment: {
          type: 'keyword',
        },
      },
    },
    span: {
      dynamic: false,
      properties: {
        id: {
          type: 'keyword',
        },
        type: {
          type: 'keyword',
        },
        subtype: {
          type: 'keyword',
        },
        destination: {
          dynamic: false,
          properties: {
            service: {
              dynamic: false,
              properties: {
                resource: {
                  type: 'keyword',
                },
                response_time: {
                  properties: {
                    count: {
                      type: 'long',
                    },
                    sum: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    parent: {
      dynamic: false,
      properties: {
        id: {
          type: 'keyword',
        },
      },
    },
    processor: {
      dynamic: false,
      properties: {
        event: {
          type: 'keyword',
        },
      },
    },
  },
};
