import { once } from "lodash";
import { useEffect } from "react";
import { licenseService } from "../licence/use_licence";
import { useAssistantAvailability } from "../use_assistant_availability";
import { useKibana } from "../kibana/use_kibana";
import { getPrompts } from "@kbn/elastic-assistant";
import { createBasePrompts } from "../assistant_provider/create_base_prompts";

export const useCreateSecurityPrompts = () => {
    const hasEnterpriseLicense = licenseService.isEnterprise();
    const assistantAvailability = useAssistantAvailability();
    const { http, notifications } = useKibana().services;

    useEffect(() => {
        const createSecurityPrompts = once(async () => {
            if (
                hasEnterpriseLicense &&
                assistantAvailability.isAssistantEnabled &&
                assistantAvailability.hasAssistantPrivilege
            ) {
                try {
                    const res = await getPrompts({
                        http,
                        toasts: notifications.toasts,
                    });

                    if (res.total === 0) {
                        await createBasePrompts(notifications, http);
                    }
                    // eslint-disable-next-line no-empty
                } catch (e) { }
            }
        });
        createSecurityPrompts();
    }, [
        assistantAvailability.hasAssistantPrivilege,
        assistantAvailability.isAssistantEnabled,
        hasEnterpriseLicense,
        http,
        notifications,
    ]);
}