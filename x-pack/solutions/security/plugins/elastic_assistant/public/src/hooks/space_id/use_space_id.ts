import { useEffect, useState } from "react";
import { useKibana } from "../../context/typed_kibana_context/typed_kibana_context";

export const useSpaceId = () => {
    const { spaces } = useKibana().services;

    const [spaceId, setSpaceId] = useState<string>();

    useEffect(() => {
        if (spaces) {
            spaces.getActiveSpace().then((space) => setSpaceId(space.id));
        }
    }, [spaces]);

    return spaceId;
};