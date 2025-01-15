/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useState } from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiTableSelectionType,
  EuiSearchBarProps,
  EuiSpacer,
} from '@elastic/eui';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { DeleteAnnotationsModal } from '../../components/annotations/components/common/delete_annotations_modal';
import { useDeleteAnnotation } from '../../components/annotations/hooks/use_delete_annotation';
import { DeleteAnnotations } from '../../components/annotations/components/common/delete_annotations';
import { useAnnotationPermissions } from '../../components/annotations/hooks/use_annotation_permissions';
import { AnnotationApplyTo } from './annotation_apply_to';
import { TimestampRangeLabel } from '../../components/annotations/components/timestamp_range_label';
import { DatePicker } from './date_picker';
import { AnnotationsListChart } from './annotations_list_chart';
import { Annotation } from '../../../common/annotations';
import { useFetchAnnotations } from '../../components/annotations/hooks/use_fetch_annotations';

export function AnnotationsList() {
  const { data: permissions } = useAnnotationPermissions();

  const [selection, setSelection] = useState<Annotation[]>([]);

  const [isEditing, setIsEditing] = useState<Annotation | null>(null);

  const [start, setStart] = useState('now-30d');
  const [end, setEnd] = useState('now');
  const { data, isLoading, refetch } = useFetchAnnotations({
    start,
    end,
  });

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { mutateAsync: deleteAnnotation, isLoading: isDeleteLoading } = useDeleteAnnotation();
  const onDelete = async (deleteSelection?: Annotation) => {
    if (deleteSelection) {
      await deleteAnnotation({ annotations: [deleteSelection] });
    } else {
      await deleteAnnotation({ annotations: selection });
      setSelection([]);
    }
    refetch();
  };

  const renderToolsLeft = () => {
    return (
      <DeleteAnnotations
        selection={selection}
        isLoading={isDeleteLoading}
        permissions={permissions}
        setIsDeleteModalVisible={setIsDeleteModalVisible}
      />
    );
  };
  const renderToolsRight = () => {
    return [
      <DatePicker start={start} end={end} setStart={setStart} setEnd={setEnd} refetch={refetch} />,
    ];
  };
  const allTags = data?.items?.map((obj) => obj.tags ?? []).flat() ?? [];
  const search: EuiSearchBarProps = {
    toolsLeft: renderToolsLeft(),
    toolsRight: renderToolsRight(),
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'tags',
        name: TAGS_LABEL,
        multiSelect: true,
        options: [...new Set(allTags)].map((tag) => ({ value: tag, name: tag })),
      },
    ],
  };
  const pagination = {
    initialPageSize: 5,
    pageSizeOptions: [5, 10, 25, 50],
  };
  const selectionValue: EuiTableSelectionType<Annotation> = {
    selectable: (annot) => true,
    onSelectionChange: (annotSel) => setSelection(annotSel),
    initialSelected: selection,
  };

  const columns: Array<EuiBasicTableColumn<Annotation>> = [
    {
      field: 'annotation.title',
      name: TITLE_LABEL,
      sortable: true,
    },
    {
      field: '@timestamp',
      name: TIMESTAMP_LABEL,
      dataType: 'date',
      sortable: true,
      render: (timestamp: string, annotation: Annotation) => {
        return <TimestampRangeLabel annotation={annotation} />;
      },
    },
    {
      field: 'message',
      name: MESSAGE_LABEL,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'tags',
      name: TAGS_LABEL,
      render: (tags: string[]) => <TagsList tags={tags} />,
    },
    {
      name: APPLY_TO_LABEL,
      render: (annotation: Annotation) => {
        return <AnnotationApplyTo annotation={annotation} />;
      },
    },
    {
      actions: [
        {
          name: EDIT_LABEL,
          description: EDIT_LABEL,
          type: 'icon',
          icon: 'pencil',
          onClick: (annotation) => {
            setIsEditing(annotation);
          },
          enabled: () => permissions?.write ?? false,
        },
        {
          name: DELETE_LABEL,
          description: DELETE_LABEL,
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (annotation) => {
            setSelection([annotation]);
            setIsDeleteModalVisible(true);
          },
          enabled: () => permissions?.write ?? false,
        },
      ],
    },
  ];

  return (
    <>
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        childrenBetween={
          <AnnotationsListChart
            data={data?.items ?? []}
            start={start}
            end={end}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            permissions={permissions}
          />
        }
        tableCaption={i18n.translate('xpack.observability.annotationsTableCaption', {
          defaultMessage: 'List of annotations for the selected time range.',
        })}
        items={data?.items ?? []}
        itemId="id"
        loading={isLoading}
        columns={columns}
        search={search}
        pagination={pagination}
        sorting={true}
        selection={selectionValue}
        tableLayout="auto"
      />
      <DeleteAnnotationsModal
        selection={selection}
        isDeleteModalVisible={isDeleteModalVisible}
        setSelection={setSelection}
        onDelete={onDelete}
        setIsDeleteModalVisible={setIsDeleteModalVisible}
      />
    </>
  );
}

const TITLE_LABEL = i18n.translate('xpack.observability.titleLabel', {
  defaultMessage: 'Title',
});

const APPLY_TO_LABEL = i18n.translate('xpack.observability.applyTo', {
  defaultMessage: 'Apply to',
});

const EDIT_LABEL = i18n.translate('xpack.observability.editAnnotation', { defaultMessage: 'Edit' });

const DELETE_LABEL = i18n.translate('xpack.observability.deleteAnnotation', {
  defaultMessage: 'Delete',
});

const TAGS_LABEL = i18n.translate('xpack.observability.tagsAnnotations', {
  defaultMessage: 'Tags',
});

const MESSAGE_LABEL = i18n.translate('xpack.observability.messageAnnotations', {
  defaultMessage: 'Message',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.observability.timestampAnnotations', {
  defaultMessage: 'Timestamp',
});
