/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

import { TimelineId } from '../../../../common/types/timeline';
import {
  alertEvents,
  allEvents,
  defaultOptions,
  getOptions,
  getSourcererScopeName,
  isDetectionsAlertsTable,
  rawEvents,
  removeIgnoredAlertFilters,
  shouldIgnoreAlertFilters,
  detectionAlertsTables,
} from './helpers';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { TableId } from '@kbn/securitysolution-data-table';

/** the following scopes are NOT detection alert tables */
const otherScopes = [
  TableId.hostsPageEvents,
  TableId.hostsPageSessions,
  TableId.networkPageEvents,
  TimelineId.active,
  TimelineId.test,
  TableId.alternateTest,
  TableId.kubernetesPageSessions,
];

const othersWithoutActive = otherScopes.filter((x) => x !== TimelineId.active);

const hostNameFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'host.name',
    params: {
      query: 'Host-abcd',
    },
  },
  query: {
    match_phrase: {
      'host.name': {
        query: 'Host-abcd',
      },
    },
  },
};

const buildingBlockTypeFilter: Filter = {
  meta: {
    alias: null,
    negate: true,
    disabled: false,
    type: 'exists',
    key: 'signal.rule.building_block_type',
    value: 'exists',
  },
  query: {
    exists: {
      field: 'signal.rule.building_block_type',
    },
  },
};

const ruleIdFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'kibana.alert.rule.rule_id',
    params: {
      query: '32a4aefa-80fb-4716-bc0f-3f7bb1f14929',
    },
  },
  query: {
    match_phrase: {
      'kibana.alert.rule.rule_id': '32a4aefa-80fb-4716-bc0f-3f7bb1f14929',
    },
  },
};

const ruleNameFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'kibana.alert.rule.name',
    params: {
      query: 'baz',
    },
  },
  query: {
    match_phrase: {
      'kibana.alert.rule.name': {
        query: 'baz',
      },
    },
  },
};

const threatMappingFilter: Filter = {
  meta: {
    alias: null,
    disabled: false,
    negate: false,
    key: 'kibana.alert.rule.type',
    type: 'term',
  },
  query: { term: { 'kibana.alert.rule.type': 'threat_match' } },
};

const workflowStatusFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'kibana.alert.workflow_status',
    params: {
      query: 'open',
    },
  },
  query: {
    term: {
      'kibana.alert.workflow_status': 'open',
    },
  },
};

const allFilters = [
  hostNameFilter,
  buildingBlockTypeFilter,
  ruleIdFilter,
  ruleNameFilter,
  threatMappingFilter,
  workflowStatusFilter,
];

describe('getOptions', () => {
  test(`it returns the default options when 'activeTimelineEventType' is undefined`, () => {
    expect(getOptions()).toEqual(defaultOptions);
  });

  test(`it returns 'allEvents' when 'activeTimelineEventType' is 'all'`, () => {
    expect(getOptions('all')).toEqual(allEvents);
  });

  test(`it returns 'rawEvents' when 'activeTimelineEventType' is 'raw'`, () => {
    expect(getOptions('raw')).toEqual(rawEvents);
  });

  test(`it returns 'alertEvents' when 'activeTimelineEventType' is 'alert'`, () => {
    expect(getOptions('alert')).toEqual(alertEvents);
  });
});

describe('isDetectionsAlertsTable', () => {
  detectionAlertsTables.forEach((tableId) =>
    test(`it returns true for detections alerts table '${tableId}'`, () => {
      expect(isDetectionsAlertsTable(tableId)).toEqual(true);
    })
  );

  otherScopes.forEach((tableId) =>
    test(`it returns false for (NON alert table) timeline '${tableId}'`, () => {
      expect(isDetectionsAlertsTable(tableId)).toEqual(false);
    })
  );
});

describe('shouldIgnoreAlertFilters', () => {
  detectionAlertsTables.forEach((tableId) => {
    test(`it returns true when the view is 'raw' for detections alerts table '${tableId}'`, () => {
      const view = 'raw';
      expect(shouldIgnoreAlertFilters({ tableId, view })).toEqual(true);
    });

    test(`it returns false when the view is NOT 'raw' for detections alerts table '${tableId}'`, () => {
      const view = 'alert'; // the default selection for detection alert tables
      expect(shouldIgnoreAlertFilters({ tableId, view })).toEqual(false);
    });
  });

  otherScopes.forEach((tableId) => {
    test(`it returns false when the view is 'raw' for (NON alert table) timeline'${tableId}'`, () => {
      const view = 'raw';
      expect(shouldIgnoreAlertFilters({ tableId, view })).toEqual(false);
    });

    test(`it returns false when the view is NOT 'raw' for (NON alert table) timeline '${tableId}'`, () => {
      const view = 'alert';
      expect(shouldIgnoreAlertFilters({ tableId, view })).toEqual(false);
    });
  });
});

describe('removeIgnoredAlertFilters', () => {
  detectionAlertsTables.forEach((tableId) => {
    test(`it removes the ignored alert filters when the view is 'raw' for detections alerts table '${tableId}'`, () => {
      const view = 'raw';
      expect(removeIgnoredAlertFilters({ filters: allFilters, tableId, view })).toEqual([
        hostNameFilter,
      ]);
    });

    test(`it does NOT remove any filters when the view is NOT 'raw' for detections alerts table '${tableId}'`, () => {
      const view = 'alert';
      expect(removeIgnoredAlertFilters({ filters: allFilters, tableId, view })).toEqual(allFilters);
    });
  });

  otherScopes.forEach((tableId) => {
    test(`it does NOT remove any filters when the view is 'raw' for (NON alert table) '${tableId}'`, () => {
      const view = 'alert';
      expect(removeIgnoredAlertFilters({ filters: allFilters, tableId, view })).toEqual(allFilters);
    });

    test(`it does NOT remove any filters when the view is NOT 'raw' for (NON alert table '${tableId}'`, () => {
      const view = 'alert';
      expect(removeIgnoredAlertFilters({ filters: allFilters, tableId, view })).toEqual(allFilters);
    });
  });
});

describe('getSourcererScopeName', () => {
  detectionAlertsTables.forEach((tableId) => {
    test(`it returns the 'default' SourcererScopeName when the view is 'raw' for detections alerts table '${tableId}'`, () => {
      const view = 'raw';
      expect(getSourcererScopeName({ scopeId: tableId, view })).toEqual(SourcererScopeName.default);
    });

    test(`it returns the 'detections' SourcererScopeName when the view is NOT 'raw' for detections alerts table '${tableId}'`, () => {
      const view = 'alert';
      expect(getSourcererScopeName({ scopeId: tableId, view })).toEqual(
        SourcererScopeName.detections
      );
    });
  });

  test(`it returns the 'default' SourcererScopeName when timelineId is undefined'`, () => {
    const tableId = undefined;
    const view = 'raw';
    expect(getSourcererScopeName({ scopeId: tableId, view })).toEqual(SourcererScopeName.default);
  });

  othersWithoutActive.forEach((tableId) => {
    test(`it returns the 'default' SourcererScopeName when the view is 'raw' for (NON alert table) timeline '${tableId}'`, () => {
      const view = 'raw';
      expect(getSourcererScopeName({ scopeId: tableId, view })).toEqual(SourcererScopeName.default);
    });

    test(`it returns the 'default' SourcererScopeName when the view is NOT 'raw' for detections alerts table '${tableId}'`, () => {
      const view = 'alert';
      expect(getSourcererScopeName({ scopeId: tableId, view })).toEqual(SourcererScopeName.default);
    });
  });
});
