import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldPath } from 'react-hook-form';
import type { CreateSLOForm } from '../types';
export declare const useRunTimeFieldBeingUsed: (name: FieldPath<CreateSLOForm>, dataView?: DataView) => string[];
