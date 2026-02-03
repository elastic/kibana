/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, kibanaMock, mockGlobalState } from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { TimelineStatusEnum } from '../../../../common/api/timeline';
import { persistTimeline } from '../../containers/api';
import { ensureTimelineIsSaved, extractTimelineIdsAndVersions } from './helpers';
import { getMockDataViewWithMatchedIndices } from '../../../data_view_manager/mocks/mock_data_view';
import type { TimelineModel } from '../model';
import { parse } from 'uuid';

jest.mock('../../containers/api');

describe('Timeline middleware helpers', () => {
  describe('ensureTimelineIsSaved', () => {
    let store = createMockStore(undefined, undefined, kibanaMock);

    beforeEach(() => {
      const dataView = getMockDataViewWithMatchedIndices();
      dataView.version = 'is-persisted';

      (kibanaMock.plugins.onStart as jest.Mock).mockReturnValue({
        dataViews: {
          found: true,
          contract: { get: () => dataView },
        },
      });

      store = createMockStore(undefined, undefined, kibanaMock);
      jest.clearAllMocks();
    });

    it('should return the given timeline if it has a `savedObjectId`', async () => {
      const testTimeline = {
        ...mockGlobalState.timeline.timelineById[TimelineId.test],
        savedObjectId: '123',
      };
      const returnedTimeline = await ensureTimelineIsSaved({
        localTimelineId: TimelineId.test,
        timeline: testTimeline,
        store,
      });

      expect(returnedTimeline).toBe(testTimeline);
    });

    it('should return a draft timeline with a savedObjectId when an unsaved timeline is passed', async () => {
      const mockSavedObjectId = 'mockSavedObjectId';
      (persistTimeline as jest.Mock).mockResolvedValue({
        ...mockGlobalState.timeline.timelineById[TimelineId.test],
        savedObjectId: mockSavedObjectId,
      });

      const returnedTimeline = await ensureTimelineIsSaved({
        localTimelineId: TimelineId.test,
        timeline: mockGlobalState.timeline.timelineById[TimelineId.test],
        store,
      });

      expect(returnedTimeline.savedObjectId).toBe(mockSavedObjectId);
      expect(returnedTimeline.status).toBe(TimelineStatusEnum.draft);
    });
  });

  describe('extractTimelineIdsAndVersions()', () => {
    let testTimeline: TimelineModel;

    beforeEach(() => {
      testTimeline = structuredClone(mockGlobalState.timeline.timelineById[TimelineId.test]);
    });

    describe('timelines', () => {
      describe('when timeline has been saved already (so id exsists)', () => {
        beforeEach(() => {
          testTimeline.savedObjectId = 'existing-timeline-id';
        });

        it('should return exisiting so id as timeline id', () => {
          expect(extractTimelineIdsAndVersions(testTimeline)).toMatchObject({
            timelineId: 'existing-timeline-id',
          });
        });
      });

      describe('when timeline has not been saved already (no so id exsists)', () => {
        beforeEach(() => {
          testTimeline.savedObjectId = null;
        });

        it('should return null timeline id', () => {
          expect(extractTimelineIdsAndVersions(testTimeline)).toMatchObject({
            timelineId: null,
          });
        });
      });
    });

    describe('templates', () => {
      beforeEach(() => {
        testTimeline.timelineType = 'template';
      });

      describe('when timeline template has been saved already (so id exsists)', () => {
        beforeEach(() => {
          testTimeline.savedObjectId = 'uuid8a7ffa2c-0d8d-4b68-800f-c4b3622bdd03';
        });

        it('should return exisiting template id', () => {
          testTimeline.templateTimelineId = 'existing-template-id';

          expect(extractTimelineIdsAndVersions(testTimeline)).toMatchObject({
            templateTimelineId: 'existing-template-id',
          });
        });
      });

      describe('when timeline template has not been saved yet (we dont have the so id)', () => {
        it('should return a new, randomly generated uuid', () => {
          testTimeline.templateTimelineId = null;
          testTimeline.savedObjectId = null;

          const a = extractTimelineIdsAndVersions(testTimeline).templateTimelineId;
          const b = extractTimelineIdsAndVersions(testTimeline).templateTimelineId;
          expect(typeof a).toBe('string');
          expect(typeof b).toBe('string');
          expect(a).not.toEqual(b);
          expect(parse(a!));
        });
      });
    });
  });
});
