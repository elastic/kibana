/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics';
import { _getMissingPrivilegesMessage } from './risk_engine_privileges';

describe('_getMissingPrivilegesMessage', () => {
  it('should create correct message for user with no cluster privileges', () => {
    const noClusterPrivileges: EntityAnalyticsPrivileges = {
      privileges: {
        elasticsearch: {
          cluster: {
            manage_index_templates: false,
            manage_transform: false,
            manage_ingest_pipelines: false,
          },
          index: {
            'risk-score.risk-score-*': {
              read: true,
              write: true,
            },
          },
        },
      },
      has_all_required: false,
    };

    const result = _getMissingPrivilegesMessage(noClusterPrivileges);

    expect(result).toMatchInlineSnapshot(
      `"User is missing risk engine privileges.  Missing cluster privileges to run the risk engine: manage_transform. Missing cluster privileges to enable the risk engine: manage_index_templates, manage_transform, manage_ingest_pipelines."`
    );
  });

  it('should create correct message for user with no index privileges', () => {
    const noIndexPrivileges: EntityAnalyticsPrivileges = {
      privileges: {
        elasticsearch: {
          cluster: {
            manage_index_templates: true,
            manage_transform: true,
            manage_ingest_pipelines: true,
          },
          index: {
            'risk-score.risk-score-*': {
              read: false,
              write: false,
            },
          },
        },
      },
      has_all_required: false,
    };

    const result = _getMissingPrivilegesMessage(noIndexPrivileges);

    expect(result).toMatchInlineSnapshot(
      `"User is missing risk engine privileges. Missing index privileges for index \\"risk-score.risk-score-*\\": read, write.  "`
    );
  });

  it('should create correct message for user with no cluster or index privileges', () => {
    const noClusterOrIndexPrivileges: EntityAnalyticsPrivileges = {
      privileges: {
        elasticsearch: {
          cluster: {
            manage_index_templates: false,
            manage_transform: false,
            manage_ingest_pipelines: false,
          },
          index: {
            'risk-score.risk-score-*': {
              read: false,
              write: false,
            },
          },
        },
      },
      has_all_required: false,
    };

    const result = _getMissingPrivilegesMessage(noClusterOrIndexPrivileges);

    expect(result).toMatchInlineSnapshot(
      `"User is missing risk engine privileges. Missing index privileges for index \\"risk-score.risk-score-*\\": read, write. Missing cluster privileges to run the risk engine: manage_transform. Missing cluster privileges to enable the risk engine: manage_index_templates, manage_transform, manage_ingest_pipelines."`
    );
  });
});
