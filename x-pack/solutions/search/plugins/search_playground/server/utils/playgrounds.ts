/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse, type SavedObject } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type {
  PlaygroundSavedObject,
  PlaygroundResponse,
  PlaygroundListResponse,
  PlaygroundListObject,
} from '../types';

export function validatePlayground(playground: PlaygroundSavedObject): string[] {
  const errors: string[] = [];
  if (playground.name.trim().length === 0) {
    errors.push(
      i18n.translate('xpack.searchPlayground.playgroundNameError', {
        defaultMessage: 'Playground name cannot be empty',
      })
    );
  }
  try {
    JSON.parse(playground.elasticsearchQueryJSON);
  } catch (e) {
    errors.push(
      i18n.translate('xpack.searchPlayground.esQueryJSONError', {
        defaultMessage: 'Elasticsearch query JSON is invalid\n{jsonParseError}',
        values: { jsonParseError: e.message },
      })
    );
  }
  if (playground.userElasticsearchQueryJSON) {
    try {
      JSON.parse(playground.userElasticsearchQueryJSON);
    } catch (e) {
      errors.push(
        i18n.translate('xpack.searchPlayground.userESQueryJSONError', {
          defaultMessage: 'User Elasticsearch query JSON is invalid\n{jsonParseError}',
          values: { jsonParseError: e.message },
        })
      );
    }
  }
  // validate query fields greater than 0 and match selected indices
  let totalFieldsCount = 0;
  Object.entries(playground.queryFields).forEach(([index, fields]) => {
    if (!playground.indices.includes(index)) {
      errors.push(
        i18n.translate('xpack.searchPlayground.queryFieldsIndexError', {
          defaultMessage: 'Query fields index {index} does not match selected indices',
          values: { index },
        })
      );
    }
    fields?.forEach((field, i) => {
      if (field.trim().length === 0) {
        errors.push(
          i18n.translate('xpack.searchPlayground.queryFieldsError', {
            defaultMessage: 'Query field cannot be empty, {index} item {i} is empty',
            values: { index, i },
          })
        );
      } else {
        totalFieldsCount++;
      }
    });
  });
  if (totalFieldsCount === 0) {
    errors.push(
      i18n.translate('xpack.searchPlayground.queryFieldsEmptyError', {
        defaultMessage: 'Query fields cannot be empty',
      })
    );
  }

  if (playground.context) {
    // validate source fields greater than 0 and match a selected index
    let totalSourceFieldsCount = 0;
    Object.entries(playground.context.sourceFields).forEach(([index, fields]) => {
      if (!playground.indices.includes(index)) {
        errors.push(
          i18n.translate('xpack.searchPlayground.sourceFieldsIndexError', {
            defaultMessage: 'Source fields index {index} does not match selected indices',
            values: { index },
          })
        );
      }
      fields?.forEach((field, i) => {
        if (field.trim().length === 0) {
          errors.push(
            i18n.translate('xpack.searchPlayground.sourceFieldsError', {
              defaultMessage: 'Source field cannot be empty, {index} item {i} is empty',
              values: { index, i },
            })
          );
        } else {
          totalSourceFieldsCount++;
        }
      });
    });
    if (totalSourceFieldsCount === 0) {
      errors.push(
        i18n.translate('xpack.searchPlayground.sourceFieldsEmptyError', {
          defaultMessage: 'Source fields cannot be empty',
        })
      );
    }
  }
  return errors;
}

export function parsePlaygroundSO(
  soPlayground: SavedObject<PlaygroundSavedObject>
): PlaygroundResponse {
  const {
    id,
    created_at: createdAt,
    created_by: createdBy,
    updated_at: updatedAt,
    updated_by: updatedBy,
    attributes,
  } = soPlayground;

  return {
    _meta: {
      id,
      createdAt,
      createdBy,
      updatedAt,
      updatedBy,
    },
    data: attributes,
  };
}

export function parsePlaygroundSOList(
  playgroundsResponse: SavedObjectsFindResponse<PlaygroundSavedObject, unknown>
): PlaygroundListResponse {
  const items: PlaygroundListObject[] = playgroundsResponse.saved_objects.map((soPlayground) => {
    const {
      id,
      created_at: createdAt,
      created_by: createdBy,
      updated_at: updatedAt,
      updated_by: updatedBy,
      attributes: { name },
    } = soPlayground;
    return {
      id,
      name,
      createdAt,
      createdBy,
      updatedAt,
      updatedBy,
    };
  });
  return {
    _meta: {
      total: playgroundsResponse.total,
      page: playgroundsResponse.page,
      size: playgroundsResponse.per_page,
    },
    items,
  };
}
