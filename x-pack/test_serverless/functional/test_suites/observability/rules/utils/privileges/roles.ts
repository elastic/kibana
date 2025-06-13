/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from './types';

// Application privileges (APM)
export const obltAppRead: Role = {
  name: 'obltAppRead',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          apm: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obltAppAll: Role = {
  name: 'obltAppAll',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          apm: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
/** **** Application privileges (APM) *****/

// Discover privileges
export const obltDiscoverRead: Role = {
  name: 'obltDiscoverRead',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          discover: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obltDiscoverAll: Role = {
  name: 'obltDiscoverAll',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          discover: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

/** **** Discover privileges *****/

// Discover_2 privileges
export const obltDiscover2Read: Role = {
  name: 'obltDiscover2Read',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          discover_v2: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obltDiscover2All: Role = {
  name: 'obltDiscover2All',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          discover_v2: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
/** **** Discover_2 privileges *****/

// Infrastructure privileges
export const obltInfraRead: Role = {
  name: 'obltInfraRead',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          infrastructure: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obltInfraAll: Role = {
  name: 'obltInfraAll',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          infrastructure: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

/** **** Infrastructure privileges *****/
// SLO privileges
export const obltSLORead: Role = {
  name: 'obltSLORead',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          slo: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};
export const obltSLOAll: Role = {
  name: 'obltSLOAll',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          slo: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
/** **** SLO privileges *****/
// Uptime privileges
export const obltUptimeRead: Role = {
  name: 'obltUptimeRead',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          uptime: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obltUptimeAll: Role = {
  name: 'obltUptimeAll',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          uptime: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
/** **** Uptime privileges *****/
