/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useMemo, useEffect } from "react";
import { IconButton, Text, Tooltip } from "@vector-im/compound-web";
import SpotlightViewIcon from "@vector-im/compound-design-tokens/assets/web/icons/spotlight-view";
import classNames from "classnames";

import { _t } from "../../../languageHandler";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { useRoomState } from "../../../hooks/useRoomState";
import { SdkContextClass } from "../../../contexts/SDKContext";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import PosthogTrackers from "../../../PosthogTrackers";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";

const AI_THREADS_EVENT_TYPE = "dev.clap.ai_threads";

interface AIThreadGroup {
    group_id: string;
    topic?: string;
    summary?: string;
    message_count?: number;
    event_ids?: string[];
}

interface AIThreadsState {
    groups?: AIThreadGroup[];
    updated_at?: string;
}

interface AIThreadsButtonProps {
    /**
     * Display the label next to the icon.
     */
    displayButtonLabel?: boolean;
}

export function AIThreadsButton({ displayButtonLabel }: AIThreadsButtonProps): JSX.Element {
    const mxClient = useMatrixClientContext();
    const activeRoomId = SdkContextClass.instance.roomViewStore.getRoomId();
    const room = activeRoomId ? mxClient.getRoom(activeRoomId) : null;
    const [isOpen, setIsOpen] = React.useState(false);

    const aiThreadState = useRoomState<AIThreadsState | undefined>(
        room ?? undefined,
        (state) => {
            const ev = state.getStateEvents(AI_THREADS_EVENT_TYPE, "");
            const event = Array.isArray(ev) ? ev[0] : ev;
            return event?.getContent<AIThreadsState>();
        },
    );

    const hasAIThreads = useMemo(() => {
        return (aiThreadState?.groups?.length ?? 0) > 0;
    }, [aiThreadState]);

    const disabled = !room;

    // Check if AIThreadList panel is currently open
    useEffect(() => {
        const checkPanelState = (): void => {
            if (!activeRoomId) return;
            const currentCard = RightPanelStore.instance.currentCardForRoom(activeRoomId);
            setIsOpen(currentCard?.phase === RightPanelPhases.AIThreadList);
        };

        checkPanelState();
        RightPanelStore.instance.on(UPDATE_EVENT, checkPanelState);

        return () => {
            RightPanelStore.instance.off(UPDATE_EVENT, checkPanelState);
        };
    }, [activeRoomId]);

    const handleClick = (): void => {
        if (disabled || !activeRoomId) return;

        // Toggle the panel: if already open, close it; otherwise open it
        RightPanelStore.instance.showOrHidePhase(RightPanelPhases.AIThreadList);
        if (!isOpen) {
            PosthogTrackers.trackInteraction("WebAIThreadsButton");
        }
    };

    return (
        <div className="mx_AIThreadsButton_container">
            <Tooltip label={_t("threads|ai_threads")} placement="right" open={displayButtonLabel ? false : undefined}>
                <IconButton
                    aria-label={_t("threads|ai_threads")}
                    className={classNames("mx_AIThreadsButton", { expanded: displayButtonLabel })}
                    indicator={hasAIThreads ? "default" : undefined}
                    onClick={handleClick}
                    disabled={disabled}
                >
                    <>
                        <SpotlightViewIcon className="mx_AIThreadsButton_Icon" />
                        {displayButtonLabel && (
                            <Text
                                className="mx_AIThreadsButton_Text"
                                as="span"
                                size="md"
                                title={_t("threads|ai_threads")}
                            >
                                {_t("threads|ai_threads")}
                            </Text>
                        )}
                    </>
                </IconButton>
            </Tooltip>
        </div>
    );
}

export default AIThreadsButton;

