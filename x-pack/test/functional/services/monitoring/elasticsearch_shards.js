/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { range } from 'lodash';

const generateVisibleTextString = (text) => {
  return text.split('\n').join(' | ');
};

const classificationsAndTooltipsReducer = (classifications, tooltips) => {
  const iterator = range(classifications.length); // NOTE: arbitrary choice to use length of classification or tooltips, they will be equal number

  return iterator.reduce((all, current) => {
    return [
      ...all,
      {
        tooltip: tooltips[current],
        classification: classifications[current],
      },
    ];
  }, []);
};

export function MonitoringElasticsearchShardsProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const SUBJ_UNASSIGNED_SHARDS = `clusterView-Unassigned > shardIcon`;
  const SUBJ_ASSIGNED_CONTAINER_PREFIX = 'clusterView-Assigned-';
  const SUBJ_SHOW_SYSTEM_INDICES = 'shardShowSystemIndices';
  const getAssignedShardsSelector = (parent) => parent + '> shardIcon'; // will be used in a descendant search starting with SUBJ_ASSIGNED_CONTAINER

  return new (class ElasticsearchShards {
    async getUnassignedIndexAllocation() {
      const hasUnassigned = await testSubjects.exists(SUBJ_UNASSIGNED_SHARDS);
      if (!hasUnassigned) {
        return null;
      }

      const classifications = await testSubjects.getAttributeAll(
        SUBJ_UNASSIGNED_SHARDS,
        'data-shard-classification'
      );
      const tooltips = await testSubjects.getAttributeAll(
        SUBJ_UNASSIGNED_SHARDS,
        'data-shard-tooltip'
      );

      return classificationsAndTooltipsReducer(classifications, tooltips);
    }

    async getAssignedIndexAllocationByNode(nodeId) {
      const assignedParentSelector = SUBJ_ASSIGNED_CONTAINER_PREFIX + nodeId;
      const hasAssigned = await testSubjects.exists(assignedParentSelector);
      if (!hasAssigned) {
        return null; // NOTE: currently this can't happen, because of a bug where if an index has 0 shards allocated, it won't be monitored :(
      }

      const assignedShardsSelector = getAssignedShardsSelector(assignedParentSelector);
      const classifications = await testSubjects.getAttributeAll(
        assignedShardsSelector,
        'data-shard-classification'
      );
      const tooltips = await testSubjects.getAttributeAll(
        assignedShardsSelector,
        'data-shard-tooltip'
      );

      return {
        visibleText: generateVisibleTextString(
          await testSubjects.getVisibleText(assignedParentSelector)
        ),
        shards: classificationsAndTooltipsReducer(classifications, tooltips),
      };
    }

    async showSystemIndices() {
      const checkboxEl = await testSubjects.find(SUBJ_SHOW_SYSTEM_INDICES);
      const isChecked = await checkboxEl.getAttribute('selected');

      if (!isChecked) {
        await testSubjects.click(SUBJ_SHOW_SYSTEM_INDICES);
      }
    }

    async getNodeAllocation(indexUuid) {
      const assignedParentSelector = SUBJ_ASSIGNED_CONTAINER_PREFIX + indexUuid;
      const hasAssigned = await testSubjects.exists(assignedParentSelector);
      if (!hasAssigned) {
        return null; // NOTE: currently this can't happen, because of a bug where if an index has 0 shards allocated, it won't be monitored :(
      }

      const assignedShardsSelector = getAssignedShardsSelector(assignedParentSelector);
      const classifications = await testSubjects.getAttributeAll(
        assignedShardsSelector,
        'data-shard-classification'
      );
      const tooltips = await testSubjects.getAttributeAll(
        assignedShardsSelector,
        'data-shard-tooltip'
      );

      return {
        visibleText: generateVisibleTextString(
          await testSubjects.getVisibleText(assignedParentSelector)
        ),
        shards: classificationsAndTooltipsReducer(classifications, tooltips),
        status: await testSubjects.getAttribute(assignedParentSelector, 'data-status'),
      };
    }
  })();
}
