/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useCallback } from "react";
import { Button } from "@vector-im/compound-web";

import { _t } from "../../../../languageHandler";
import { MatrixClientPeg } from "../../../../MatrixClientPeg";
import { findDMForUser } from "../../../../utils/dm/findDMForUser";
import RightPanelStore from "../../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../../stores/right-panel/RightPanelStorePhases";

export const CLAP_AI_USER_ID = "@clap-ai:dev.clap.ac";

export const ClapAIChatButton: React.FC = () => {
    const onClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();

        const currentPhase = RightPanelStore.instance.currentCard.phase;
        const isOpen = RightPanelStore.instance.isOpen;
        if (currentPhase === RightPanelPhases.ClapAIChat && isOpen) {
            RightPanelStore.instance.togglePanel(null);
            return;
        }

        const client = MatrixClientPeg.safeGet();
        const existingRoom = findDMForUser(client, CLAP_AI_USER_ID);

        RightPanelStore.instance.setCard({
            phase: RightPanelPhases.ClapAIChat,
            state: { clapAIRoomId: existingRoom?.roomId },
        });
        RightPanelStore.instance.show(null);
    }, []);

    return (
        <Button size="sm" kind="secondary" onClick={onClick} aria-label={_t("room_header|ai_button")}>
            {_t("room_header|ai_button")}
        </Button>
    );
};
