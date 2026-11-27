/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  signalEntrySchema,
  type Detection,
  type SignalEntry,
  type SignalInputEntry,
} from '@kbn/significant-events-schema';
import type { BulkWriteValidationReason } from '../bulk_write';

/** The stored detection fields a signal carries as its metadata. */
const metadataOf = (detection: Detection) => ({
  detection_id: detection.detection_id,
  rule_uuid: detection.rule_uuid,
  rule_name: detection.rule_name,
  change_point_type: detection.change_point_type,
  p_value: detection.p_value,
  severity_score: detection.severity_score,
});

interface WithInputSignals {
  signals?: SignalInputEntry[];
}
type WithSignals<TItem extends WithInputSignals> = Omit<TItem, 'signals'> & {
  signals?: SignalEntry[];
};

/** One item the write refuses on its own. The other items of the call still proceed. */
export interface ItemPreparationRejection {
  index: number;
  reason: BulkWriteValidationReason;
  message: string;
}

export interface PreparedWriteItem<TItem extends WithInputSignals> {
  index: number;
  item: WithSignals<TItem>;
}

/**
 * Fills each detection signal's metadata from the stored detection it names, so the agent only
 * identifies a detection and never has to copy it. A detection that is not stored keeps the
 * metadata the agent sent, which must then be complete. An item whose signal names a stored
 * detection of a different rule, or whose unstored detection is missing metadata, is rejected
 * alone; the other items are returned.
 */
export const fillDetectionMetadata = async <TItem extends WithInputSignals>({
  items,
  findDetections,
}: {
  items: TItem[];
  findDetections: (detectionIds: string[]) => Promise<{ hits: Detection[] }>;
}): Promise<{
  items: Array<PreparedWriteItem<TItem>>;
  rejections: ItemPreparationRejection[];
}> => {
  const detectionIds = [
    ...new Set(
      items.flatMap(({ signals }) => (signals ?? []).map(({ metadata }) => metadata.detection_id))
    ),
  ];
  const stored = new Map(
    (detectionIds.length > 0 ? (await findDetections(detectionIds)).hits : []).map((detection) => [
      detection.detection_id,
      detection,
    ])
  );

  const kept: Array<PreparedWriteItem<TItem>> = [];
  const rejections: ItemPreparationRejection[] = [];
  items.forEach((item, itemIndex) => {
    const signals: SignalEntry[] = [];
    for (let index = 0; index < (item.signals ?? []).length; index++) {
      const signal = item.signals?.[index];
      if (signal === undefined) continue;
      const detection = stored.get(signal.metadata.detection_id);
      if (detection && detection.rule_uuid !== signal.metadata.rule_uuid) {
        rejections.push({
          index: itemIndex,
          reason: 'detection_rule_mismatch',
          message: `items[${itemIndex}].signals[${index}]: detection_id ${signal.metadata.detection_id} belongs to rule ${detection.rule_uuid}, not ${signal.metadata.rule_uuid}. Copy detection_id and rule_uuid from the same input detection.`,
        });
        return;
      }
      const filled = { ...signal, metadata: detection ? metadataOf(detection) : signal.metadata };
      const parsed = signalEntrySchema.safeParse(filled);
      if (!parsed.success) {
        const fields = parsed.error.issues.map(({ path }) => path.join('.')).join(', ');
        rejections.push({
          index: itemIndex,
          reason: 'detection_not_stored',
          message: `items[${itemIndex}].signals[${index}]: detection ${signal.metadata.detection_id} is not stored, so its metadata must be copied in full from the input detection (${fields}).`,
        });
        return;
      }
      signals.push(parsed.data);
    }
    kept.push({ index: itemIndex, item: { ...item, signals } });
  });
  return { items: kept, rejections };
};
