import { once } from "lodash";
import { useEffect } from "react";
import { licenseService } from "../licence/use_licence";
import { useAssistantAvailability } from "../use_assistant_availability";
import { getUserConversationsExist } from "@kbn/elastic-assistant";
import { useKibana } from "../kibana/use_kibana";
import { createConversations } from "../assistant_provider/create_conversation";

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
