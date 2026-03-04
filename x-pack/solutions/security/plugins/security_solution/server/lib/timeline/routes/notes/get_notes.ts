/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type {
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
} from '@kbn/core-saved-objects-api-server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-server';
import type { UserProfile } from '@kbn/core-user-profile-common';
import type { StartPlugins } from '../../../../plugin_contract';
import { AssociatedFilter } from '../../../../../common/notes/constants';
import { timelineSavedObjectType } from '../../saved_object_mappings';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { NOTES_PER_PAGE_HARD_LIMIT, NOTE_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../utils/common';
import { getAllSavedNote } from '../../saved_object/notes';
import { noteSavedObjectType } from '../../saved_object_mappings/notes';
import { GetNotesRequestQuery, type GetNotesResponse } from '../../../../../common/api/timeline';

/* eslint-disable complexity */
export const getNotesRoute = (
  router: SecuritySolutionPluginRouter,
  startServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .get({
      path: NOTE_URL,
      security: {
        authz: {
          requiredPrivileges: ['notes_read'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { query: buildRouteValidationWithZod(GetNotesRequestQuery) },
        },
        version: '2023-10-31',
      },
      async (context, request, response): Promise<IKibanaResponse<GetNotesResponse>> => {
        try {
          const queryParams = request.query;
          const frameworkRequest = await buildFrameworkRequest(context, request);

          // if documentIds is provided, we will search for all the notes associated with the documentIds
          const documentIds = queryParams.documentIds ?? null;
          if (documentIds != null) {
            // search for multiple document ids (like retrieving all the notes for all the alerts within a table)
            if (Array.isArray(documentIds)) {
              const options: SavedObjectsFindOptions = {
                type: noteSavedObjectType,
                filter: nodeBuilder.or(
                  documentIds.map((documentId: string) =>
                    nodeBuilder.is(`${noteSavedObjectType}.attributes.eventId`, documentId)
                  )
                ),
                page: 1,
                perPage: NOTES_PER_PAGE_HARD_LIMIT,
              };
              const res = await getAllSavedNote(frameworkRequest, options);
              return response.ok({ body: res });
            }

            // searching for all the notes associated with a specific document id
            const options: SavedObjectsFindOptions = {
              type: noteSavedObjectType,
              filter: nodeBuilder.is(`${noteSavedObjectType}.attributes.eventId`, documentIds),
              page: 1,
              perPage: NOTES_PER_PAGE_HARD_LIMIT,
            };
            const res = await getAllSavedNote(frameworkRequest, options);
            return response.ok({ body: res });
          }

          // if savedObjectIds is provided, we will search for all the notes associated with the savedObjectIds
          const savedObjectIds = queryParams.savedObjectIds ?? null;
          if (savedObjectIds != null) {
            // search for multiple saved object ids
            if (Array.isArray(savedObjectIds)) {
              const options: SavedObjectsFindOptions = {
                type: noteSavedObjectType,
                hasReference: savedObjectIds.map((savedObjectId: string) => ({
                  type: timelineSavedObjectType,
                  id: savedObjectId,
                })),
                page: 1,
                perPage: NOTES_PER_PAGE_HARD_LIMIT,
              };
              const res = await getAllSavedNote(frameworkRequest, options);
              return response.ok({ body: res });
            }

            // searching for all the notes associated with a specific saved object id
            const options: SavedObjectsFindOptions = {
              type: noteSavedObjectType,
              hasReference: {
                type: timelineSavedObjectType,
                id: savedObjectIds,
              },
              perPage: NOTES_PER_PAGE_HARD_LIMIT,
            };
            const res = await getAllSavedNote(frameworkRequest, options);
            return response.ok({ body: res });
          }

          // retrieving all the notes following the query parameters
          const perPage = queryParams?.perPage ? parseInt(queryParams.perPage, 10) : 10;
          const page = queryParams?.page ? parseInt(queryParams.page, 10) : 1;
          const search = queryParams?.search ?? undefined;
          const sortField = queryParams?.sortField ?? undefined;
          const sortOrder = (queryParams?.sortOrder as SortOrder) ?? undefined;
          const filter = queryParams?.filter;
          const options: SavedObjectsFindOptions = {
            type: noteSavedObjectType,
            perPage,
            page,
            search,
            sortField,
            sortOrder,
            filter,
          };

          // we need to combine the associatedFilter with the filter query
          // we have to type cast here because the filter is a string (from the schema) and that cannot be changed as it would be a breaking change
          // only add the filter to the array if it's provided (non-empty), otherwise the nodeBuilder.and will not work correctly
          const filterKueryNodeArray: KueryNode[] = [];
          if (filter) {
            filterKueryNodeArray.push(filter as unknown as KueryNode);
          }

          // retrieve all the notes created by a specific user
          // the createdByFilter value is the uuid of the user
          const createdByFilter = queryParams?.createdByFilter; // now uuid
          if (createdByFilter) {
            // because the notes createdBy property can be either full_name, email or username
            // see pickSaveNote (https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/timeline/saved_object/notes/saved_object.ts#L302)
            // which uses the getUserDisplayName (https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-user-profile-components/src/user_profile.ts#L138)
            const [_, { security }] = await startServices();
            const users: UserProfile[] = await security.userProfiles.bulkGet({
              uids: new Set([createdByFilter]),
            });
            // once we retrieve the user by the uuid we can search all the notes that have the createdBy property with full_name, email or username values
            if (users && users.length > 0) {
              const {
                user: { email, full_name: fullName, username: userName },
              } = users[0];
              const createdByNodeArray = [];
              if (fullName) {
                createdByNodeArray.push(
                  nodeBuilder.is(`${noteSavedObjectType}.attributes.createdBy`, fullName)
                );
              }
              if (userName) {
                createdByNodeArray.push(
                  nodeBuilder.is(`${noteSavedObjectType}.attributes.createdBy`, userName)
                );
              }
              if (email) {
                createdByNodeArray.push(
                  nodeBuilder.is(`${noteSavedObjectType}.attributes.createdBy`, email)
                );
              }
              filterKueryNodeArray.push(nodeBuilder.or(createdByNodeArray));
            } else {
              throw new Error(`User with uid ${createdByFilter} not found`);
            }
          }

          const associatedFilter = queryParams?.associatedFilter;
          if (associatedFilter) {
            // Reference filter: empty id means "not associated with a timeline"
            // hasReference = referenceToATimeline means note is NOT attached to any timeline
            // hasNoReference = referenceToATimeline means note IS attached to a timeline
            const referenceToATimeline: SavedObjectsFindOptionsReference = {
              type: timelineSavedObjectType,
              id: '',
            };

            // Filter for notes without eventId (eventId is empty string)
            // Note: This only matches empty strings, not undefined/missing eventId fields
            const emptyDocumentIdFilter: KueryNode = nodeBuilder.is(
              `${noteSavedObjectType}.attributes.eventId`,
              ''
            );

            switch (associatedFilter) {
              case AssociatedFilter.documentOnly:
                // select documents that have a reference to an empty saved object id (not associated with a timeline)
                // and have a value in the eventId field (associated with a document)
                // Note: eventId filtering is done post-query because some notes have undefined eventId (not empty string)
                options.hasReference = referenceToATimeline;
                break;
              case AssociatedFilter.savedObjectOnly:
                // select documents that don't have a reference to an empty saved object id (associated with a timeline)
                // and don't have a value in the eventId field (not associated with a document)
                options.hasNoReference = referenceToATimeline;
                // Note: eventId filtering is done post-query because some notes (like investigation guides)
                // have undefined eventId field, which cannot be matched by query-time `eventId === ''` checks.
                break;
              case AssociatedFilter.documentAndSavedObject:
                // select documents that don't have a reference to an empty saved object id (associated with a timeline)
                // and have a value in the eventId field (associated with a document)
                // Note: eventId filtering is done post-query because some notes (like investigation guides)
                // have undefined eventId field, which the query filter `not (eventId === '')` cannot exclude
                options.hasNoReference = referenceToATimeline;
                break;
              case AssociatedFilter.orphan:
                // select documents that have a reference to an empty saved object id (not associated with a timeline)
                // and don't have a value in the eventId field (not associated with a document)
                options.hasReference = referenceToATimeline;
                filterKueryNodeArray.push(emptyDocumentIdFilter);
                break;
            }
          }

          // combine all filters (only if there are filters to apply)
          if (filterKueryNodeArray.length > 0) {
            options.filter =
              filterKueryNodeArray.length === 1
                ? filterKueryNodeArray[0]
                : nodeBuilder.and(filterKueryNodeArray);
          }

          const res = await getAllSavedNote(frameworkRequest, options);

          // For documentOnly and documentAndSavedObject, filter to notes with a valid eventId.
          // We can't do this at query level because the saved objects API can only check
          // if eventId equals empty string, not if the field exists/is undefined.
          if (
            associatedFilter === AssociatedFilter.documentOnly ||
            associatedFilter === AssociatedFilter.documentAndSavedObject
          ) {
            res.notes = res.notes.filter((note) => note.eventId && note.eventId !== '');
            res.totalCount = res.notes.length;
          } else if (associatedFilter === AssociatedFilter.savedObjectOnly) {
            // Timeline-only notes should include both empty and missing eventId.
            res.notes = res.notes.filter((note) => !note.eventId || note.eventId === '');
            res.totalCount = res.notes.length;
          }

          return response.ok({ body: res });
        } catch (err) {
          const error = transformError(err);
          const siemResponse = buildSiemResponse(response);

          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
