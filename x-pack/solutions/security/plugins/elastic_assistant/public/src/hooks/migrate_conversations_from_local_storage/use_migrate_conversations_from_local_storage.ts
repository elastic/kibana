import { once } from "lodash";
import { useEffect } from "react";
import { licenseService } from "../licence/use_licence";
import { useAssistantAvailability } from "../assistant_availability/use_assistant_availability";
import { getUserConversationsExist } from "@kbn/elastic-assistant";
import { useKibana } from "../../context/typed_kibana_context/typed_kibana_context";
import { createConversations } from "../../utils/create_conversation";

export const useMigrateConversationsFromLocalStorage = () => {
    const hasEnterpriseLicense = licenseService.isEnterprise();
    const assistantAvailability = useAssistantAvailability();
    const {http, notifications, storage} = useKibana().services;
    
    
    useEffect(() => {
        const migrateConversationsFromLocalStorage = once(async () => {
            if (
                hasEnterpriseLicense &&
                assistantAvailability.isAssistantEnabled &&
                assistantAvailability.hasAssistantPrivilege
            ) {
                const conversationsExist = await getUserConversationsExist({
                    http,
                });
                if (!conversationsExist) {
                    await createConversations(notifications, http, storage);
                }
            }
        });
        migrateConversationsFromLocalStorage();
    }, [
        assistantAvailability.hasAssistantPrivilege,
        assistantAvailability.isAssistantEnabled,
        hasEnterpriseLicense,
        http,
        notifications,
        storage,
    ]);
};
