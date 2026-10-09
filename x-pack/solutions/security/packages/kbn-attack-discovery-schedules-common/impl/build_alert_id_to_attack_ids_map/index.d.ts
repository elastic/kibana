export interface AttackWithAlertIds {
    alertIds: string[];
    attackId: string;
}
/**
 * Inverts a set of attacks (each with its own id and the ids of the underlying
 * detection alerts it references) into a map of detection alert id -> attack
 * ids, aggregating attacks that share the same underlying alert.
 *
 * The resulting map is consumed by `updateAlertsWithAttackIds` to back-fill the
 * `kibana.alert.attack_ids` field on the original detection alerts. Both the
 * scheduled and ad-hoc Attack discovery persistence paths use this so their
 * back-fill behavior cannot diverge.
 */
export declare const buildAlertIdToAttackIdsMap: ({ attacks, }: {
    attacks: AttackWithAlertIds[];
}) => Record<string, string[]>;
