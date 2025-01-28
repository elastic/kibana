/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { BrushEvent, TooltipSpec, LineAnnotationEvent, RectAnnotationEvent } from '@elastic/charts';
import { FormProvider, useForm } from 'react-hook-form';
import moment from 'moment';
import useKey from 'react-use/lib/useKey';
import { clone } from 'lodash';
import {
  defaultRangeAnnotationLabel,
  defaultAnnotationRangeColor,
} from '@kbn/event-annotation-common';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { getDefaultAnnotation } from './default_annotation';
import { useEditAnnotationHelper } from './hooks/use_edit_annotation_helper';
import type { CreateAnnotationForm } from './components/create_annotation';
import { ObservabilityAnnotations, CreateAnnotation } from './components';
import { useFetchAnnotations } from './hooks/use_fetch_annotations';
import type { Annotation } from '../../../common/annotations';
import { useAnnotationCRUDS } from './hooks/use_annotation_cruds';

export const useAnnotations = ({
  domain,
  editAnnotation,
  slo,
  setEditAnnotation,
}: {
  slo?: SLOWithSummaryResponse;
  editAnnotation?: Annotation | null;
  setEditAnnotation?: (annotation: Annotation | null) => void;
  domain?: {
    min: number | string;
    max: number | string;
  };
} = {}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const methods = useForm<CreateAnnotationForm>({
    defaultValues: getDefaultAnnotation({ slo }),
    mode: 'all',
  });
  const { setValue, reset } = methods;
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [selectedEditAnnotation, setSelectedEditAnnotation] = useState<Annotation | null>(null);

  const { data, refetch } = useFetchAnnotations({
    start: domain?.min ? String(domain?.min) : 'now-30d',
    end: domain?.min ? String(domain?.max) : 'now',
    slo,
  });

  useKey(
    (event) => event.metaKey,
    (event) => {
      setIsCtrlPressed(event.type === 'keydown');
    }
  );

  useEditAnnotationHelper({
    reset,
    editAnnotation,
    setIsCreateOpen,
  });

  const onCancel = useCallback(() => {
    setValue('event.end', null);
    setIsCreateOpen(false);
    setSelectedEditAnnotation(null);
    setEditAnnotation?.(null);
  }, [setEditAnnotation, setValue]);

  const { createAnnotation, updateAnnotation, deleteAnnotation, isLoading } = useAnnotationCRUDS();
  const AddAnnotationButton = useMemo(() => {
    if (!isCreateOpen) return () => null;

    return () => (
      <CreateAnnotation
        onSave={() => {
          setIsCreateOpen(false);
          refetch();
        }}
        onCancel={onCancel}
        editAnnotation={editAnnotation ?? selectedEditAnnotation}
        isCreateAnnotationsOpen={isCreateOpen}
        createAnnotation={createAnnotation}
        updateAnnotation={updateAnnotation}
        deleteAnnotation={deleteAnnotation}
        isLoading={isLoading}
      />
    );
  }, [
    createAnnotation,
    deleteAnnotation,
    editAnnotation,
    isCreateOpen,
    isLoading,
    onCancel,
    refetch,
    selectedEditAnnotation,
    updateAnnotation,
  ]);

  return {
    annotations: data?.items ?? [],
    onAnnotationClick: (annotations: {
      rects: RectAnnotationEvent[];
      lines: LineAnnotationEvent[];
    }) => {
      if (annotations.rects.length) {
        const selectedAnnotation = data?.items?.find((a) => annotations.rects[0].id.includes(a.id));
        if (selectedAnnotation) {
          const editData = clone(selectedAnnotation);
          reset({
            ...editData,
            '@timestamp': moment(editData['@timestamp']),
            event: {
              end: editData.event ? moment(editData.event.end) : undefined,
              start: moment(editData['@timestamp']),
            },
          });
          setIsCreateOpen(true);
          setSelectedEditAnnotation(editData);
        }
      }
      if (annotations.lines.length) {
        const selectedAnnotation = data?.items?.find((a) => annotations.lines[0].id.includes(a.id));
        if (selectedAnnotation) {
          const editData = clone(selectedAnnotation);
          reset({
            ...editData,
            '@timestamp': moment(editData['@timestamp']),
          });
          setSelectedEditAnnotation(editData);
          setIsCreateOpen(true);
        }
      }
    },
    wrapOnBrushEnd: (originalHandler: (event: BrushEvent) => void) => {
      return (event: BrushEvent) => {
        if (isCtrlPressed) {
          setSelectedEditAnnotation(null);
          const { to, from } = getBrushData(event);
          reset(
            getDefaultAnnotation({
              slo,
              timestamp: moment(from),
              eventEnd: moment(to),
            })
          );

          setIsCreateOpen(true);
        } else {
          // Call the original handler
          originalHandler?.(event);
        }
      };
    },
    createAnnotation: (start: string | number, end?: string | null) => {
      if (isCreateOpen) return;
      reset(getDefaultAnnotation({ slo }));

      if (isNaN(Number(start))) {
        setValue('@timestamp', moment(start));
      } else {
        setValue('@timestamp', moment(new Date(Number(start))));
      }
      if (end) {
        setValue('event.end', moment(new Date(Number(end))));
      }
      if (end) {
        setValue('message', defaultRangeAnnotationLabel);
        setValue('annotation.style.color', defaultAnnotationRangeColor);
      }
      setIsCreateOpen(true);
    },
    AddAnnotationButton: () => {
      return (
        <FormProvider {...methods}>
          <AddAnnotationButton />
        </FormProvider>
      );
    },
    ObservabilityAnnotations: ({
      tooltipSpecs,
      annotations,
    }: {
      tooltipSpecs?: Partial<TooltipSpec>;
      annotations?: Annotation[];
    }) => {
      return (
        <FormProvider {...methods}>
          <ObservabilityAnnotations
            tooltipSpecs={tooltipSpecs}
            annotations={annotations}
            slo={slo}
            isCreateOpen={isCreateOpen}
            setIsCreateOpen={setIsCreateOpen}
          />
          <AddAnnotationButton />
        </FormProvider>
      );
    },
  };
};

function getBrushData(e: BrushEvent) {
  const [from, to] = [Number(e.x?.[0]), Number(e.x?.[1])];
  const [fromUtc, toUtc] = [moment(from).format(), moment(to).format()];

  return { from: fromUtc, to: toUtc };
}
