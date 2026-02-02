/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useCallback } from "react";
import { Button } from "@vector-im/compound-web";

import { _t } from "../../../../languageHandler";
import { MatrixClientPeg } from "../../../../MatrixClientPeg";
import { findDMForUser } from "../../../../utils/dm/findDMForUser";
import createRoom from "../../../../createRoom";
import { waitForMember } from "../../../../utils/membership";
import RightPanelStore from "../../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../../stores/right-panel/RightPanelStorePhases";

// Clapbot user ID - consider moving to a config file
const CLAPBOT_USER_ID = "@clap-bot-rs:dev.clap.ac";

export const ClapbotChatButton: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);

    const onClick = useCallback(
        async (event: React.MouseEvent) => {
            event.stopPropagation();

            if (isLoading) return;

            // Toggle: if ClapbotChat is already open, close it
            const currentPhase = RightPanelStore.instance.currentCard.phase;
            const isOpen = RightPanelStore.instance.isOpen;
            if (currentPhase === RightPanelPhases.ClapbotChat && isOpen) {
                RightPanelStore.instance.togglePanel(null);
                return;
            }

            setIsLoading(true);
            try {
                const client = MatrixClientPeg.safeGet();

                // Find existing DM room with Clapbot
                let roomId: string | undefined = findDMForUser(client, CLAPBOT_USER_ID)?.roomId;

                // If no existing DM, create one without E2EE
                if (!roomId) {
                    const newRoomId = await createRoom(client, {
                        dmUserId: CLAPBOT_USER_ID,
                        encryption: false, // Clapbot DM should not be encrypted
                        spinner: false,
                        andView: false,
                    });
                    if (newRoomId) {
                        await waitForMember(client, newRoomId, CLAPBOT_USER_ID);
                    }
                    roomId = newRoomId ?? undefined;
                }

                if (roomId) {
                    RightPanelStore.instance.setCard({
                        phase: RightPanelPhases.ClapbotChat,
                        state: { clapbotRoomId: roomId },
                    });
                    // Ensure the panel is visible (setCard doesn't always open when same phase)
                    RightPanelStore.instance.show(null);
                }
            } catch (error) {
                console.error("Failed to open Clapbot chat:", error);
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading],
    );

    return (
        <Button
            size="sm"
            kind="secondary"
            onClick={onClick}
            disabled={isLoading}
            aria-label={_t("room_header|ai_button")}
        >
            {_t("room_header|ai_button")}
        </Button>
    );
};
