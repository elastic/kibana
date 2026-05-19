import type { UiSettingsType } from '@kbn/core/public';
import type { FieldDefinition, OnFieldChangeFn, UnsavedFieldChange } from '@kbn/management-settings-types';
export declare function useEditableSettings(settingsKeys: string[]): {
    fields: Record<string, FieldDefinition<UiSettingsType, string | number | boolean | (string | number)[] | null | undefined>>;
    unsavedChanges: Record<string, UnsavedFieldChange<UiSettingsType>>;
    handleFieldChange: OnFieldChangeFn;
    saveAll: () => Promise<void>;
    isSaving: boolean;
    cleanUnsavedChanges: () => void;
    saveSingleSetting: (id: string, change: UnsavedFieldChange<UiSettingsType>["unsavedValue"]) => Promise<void>;
};
