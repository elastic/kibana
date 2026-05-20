/**
 * This hook handles the unregistration of inputs when selecting another SLI indicator.
 * We could not use shouldUnregister on the controlled form fields because of a bug when submitting the form
 * which was unmounting the components and therefore unregistering the associated values.
 */
export declare function useUnregisterFields({ isEditMode }: {
    isEditMode: boolean;
}): void;
