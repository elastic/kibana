/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeViewModel, EdgeViewModel } from '../types';

export const basicSample = {
  nodes: [
    {
      id: 'A',
      label: 'A',
      color: 'primary',
      kind: 'entity',
      icon: 'user',
    },
    {
      id: 'B',
      label: 'B',
      color: 'primary',
      kind: 'entity',
      icon: 'user',
    },
    {
      id: 'a(A)-b(B)label(IndividualLabel)',
      label: 'IndividualLabel',
      source: 'A',
      target: 'B',
      color: 'primary',
      kind: 'event',
    },
  ] as NodeViewModel[],
  edges: [
    {
      id: 'a(A)-b(a(A)-b(B)label(IndividualLabel))',
      source: 'A',
      sourceKind: 'entity',
      target: 'a(A)-b(B)label(IndividualLabel)',
      targetKind: 'event',
      color: 'primary',
    },
    {
      id: 'a(a(A)-b(B)label(IndividualLabel))-b(B)',
      source: 'a(A)-b(B)label(IndividualLabel)',
      sourceKind: 'event',
      target: 'B',
      targetKind: 'entity',
      color: 'primary',
    },
  ] as EdgeViewModel[],
};

export const graphSample = {
  nodes: [
    {
      id: 'A',
      label: 'A',
      color: 'danger',
      kind: 'entity',
      icon: 'user',
    },
    {
      id: 'B',
      label: 'B',
      color: 'danger',
      kind: 'entity',
      icon: 'user',
    },
    {
      id: 'C',
      label: 'C',
      color: 'primary',
      kind: 'entity',
      icon: 'user',
    },
    {
      id: 'D',
      label: 'D',
      color: 'primary',
      kind: 'entity',
      icon: 'storage',
    },
    {
      id: 'E',
      label: 'E',
      color: 'primary',
      kind: 'entity',
      icon: 'storage',
    },
    {
      id: 'a(A)-b(B)label(IndividualLabel)',
      label: 'IndividualLabel',
      source: 'A',
      target: 'B',
      color: 'danger',
      kind: 'event',
    },
    {
      id: 'grp(a(B)-b(C))',
      kind: 'group',
    },
    {
      id: 'a(B)-b(C)label(StackedLabel1)',
      label: 'StackedLabel1',
      source: 'B',
      target: 'C',
      color: 'primary',
      kind: 'event',
      parentId: 'grp(a(B)-b(C))',
    },
    {
      id: 'a(B)-b(C)label(StackedLabel2)',
      label: 'StackedLabel2',
      source: 'B',
      target: 'C',
      color: 'primary',
      kind: 'event',
      parentId: 'grp(a(B)-b(C))',
    },
    {
      id: 'a(A)-b(D)rel(Owns)',
      label: 'Owns',
      kind: 'relationship',
    },
    {
      id: 'a(A)-b(E)rel(Communicates_with)',
      label: 'Communicates with',
      kind: 'relationship',
    },
  ] as NodeViewModel[],
  edges: [
    {
      id: 'a(A)-b(a(A)-b(B)label(IndividualLabel))',
      source: 'A',
      sourceKind: 'entity',
      target: 'a(A)-b(B)label(IndividualLabel)',
      targetKind: 'event',
      color: 'danger',
    },
    {
      id: 'a(a(A)-b(B)label(IndividualLabel))-b(B)',
      source: 'a(A)-b(B)label(IndividualLabel)',
      sourceKind: 'event',
      target: 'B',
      targetKind: 'entity',
      color: 'danger',
    },
    {
      id: 'a(B)-b(grp(a(B)-b(C)))',
      source: 'B',
      sourceKind: 'entity',
      target: 'grp(a(B)-b(C))',
      targetKind: 'group',
      color: 'primary',
    },
    {
      id: 'a(grp(a(B)-b(C)))-b(C)',
      source: 'grp(a(B)-b(C))',
      sourceKind: 'group',
      target: 'C',
      targetKind: 'entity',
      color: 'primary',
    },
    {
      id: 'a(grp(a(B)-b(C)))-b(a(B)-b(C)label(StackedLabel1))',
      source: 'grp(a(B)-b(C))',
      sourceKind: 'group',
      target: 'a(B)-b(C)label(StackedLabel1)',
      targetKind: 'event',
      color: 'primary',
    },
    {
      id: 'a(a(B)-b(C)label(StackedLabel1))-b(grp(a(B)-b(C)))',
      source: 'a(B)-b(C)label(StackedLabel1)',
      sourceKind: 'event',
      target: 'grp(a(B)-b(C))',
      targetKind: 'group',
      color: 'primary',
    },
    {
      id: 'a(grp(a(B)-b(C)))-b(a(B)-b(C)label(StackedLabel2))',
      source: 'grp(a(B)-b(C))',
      sourceKind: 'group',
      target: 'a(B)-b(C)label(StackedLabel2)',
      targetKind: 'event',
      color: 'primary',
    },
    {
      id: 'a(a(B)-b(C)label(StackedLabel2))-b(grp(a(B)-b(C)))',
      source: 'a(B)-b(C)label(StackedLabel2)',
      sourceKind: 'event',
      target: 'grp(a(B)-b(C))',
      targetKind: 'group',
      color: 'primary',
    },
    {
      id: 'a(A)-b(a(A)-b(D)rel(Owns))',
      source: 'A',
      sourceKind: 'entity',
      target: 'a(A)-b(D)rel(Owns)',
      targetKind: 'relationship',
      color: 'subdued',
    },
    {
      id: 'a(a(A)-b(D)rel(Owns))-b(D)',
      source: 'a(A)-b(D)rel(Owns)',
      sourceKind: 'relationship',
      target: 'D',
      targetKind: 'entity',
      color: 'subdued',
    },
    {
      id: 'a(A)-b(a(A)-b(E)rel(Communicates_with))',
      source: 'A',
      sourceKind: 'entity',
      target: 'a(A)-b(E)rel(Communicates_with)',
      targetKind: 'relationship',
      color: 'subdued',
    },
    {
      id: 'a(a(A)-b(E)rel(Communicates_with))-b(E)',
      source: 'a(A)-b(E)rel(Communicates_with)',
      sourceKind: 'relationship',
      target: 'E',
      targetKind: 'entity',
      color: 'subdued',
    },
  ] as EdgeViewModel[],
};
