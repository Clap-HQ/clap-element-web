/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useMemo } from "react";
import { type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";
import LinkIcon from "@vector-im/compound-design-tokens/assets/web/icons/link";

import { _t } from "../../../languageHandler";
import AccessibleButton, { type ButtonEvent } from "../elements/AccessibleButton";
import PosthogTrackers from "../../../PosthogTrackers";
import { useRoomState } from "../../../hooks/useRoomState";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";

const AI_THREADS_EVENT_TYPE = "dev.clap.ai_threads";

interface AIThreadGroup {
    group_id: string;
    topic?: string;
    summary?: string;
    confidence?: number;
    message_count?: number;
    event_ids?: string[];
    first_ts?: number;
    last_ts?: number;
    root_event_id?: string;
}

interface AIThreadsState {
    groups?: AIThreadGroup[];
}

interface IProps {
    mxEvent: MatrixEvent;
    room: Room;
}

/**
 * Finds the AI thread group that contains the given event
 */
function findAIThreadGroupForEvent(
    eventId: string,
    aiThreadState: AIThreadsState | undefined,
): AIThreadGroup | undefined {
    if (!aiThreadState?.groups) return undefined;

    for (const group of aiThreadState.groups) {
        if (group.event_ids?.includes(eventId)) {
            return group;
        }
    }
    return undefined;
}

/**
 * AIThreadSummary - Shows a badge on messages that are part of an AI thread group
 * Similar to ThreadSummary but for LLM-classified virtual threads
 */
const AIThreadSummary: React.FC<IProps> = ({ mxEvent, room }) => {
    const aiThreadState = useRoomState<AIThreadsState | undefined>(
        room,
        (state) => {
            const ev = state.getStateEvents(AI_THREADS_EVENT_TYPE, "");
            const event = Array.isArray(ev) ? ev[0] : ev;
            return event?.getContent<AIThreadsState>();
        },
    );

    const eventId = mxEvent.getId();
    const aiThreadGroup = useMemo(() => {
        if (!eventId) return undefined;
        return findAIThreadGroupForEvent(eventId, aiThreadState);
    }, [eventId, aiThreadState]);

    // Only show on the first message of the group (root message)
    const isRootMessage = useMemo(() => {
        if (!aiThreadGroup || !eventId) return false;
        if (aiThreadGroup.root_event_id) {
            return aiThreadGroup.root_event_id === eventId;
        }
        return aiThreadGroup.event_ids?.[0] === eventId;
    }, [aiThreadGroup, eventId]);

    if (!aiThreadGroup || !isRootMessage) {
        return null;
    }

    const messageCount = aiThreadGroup.message_count ?? aiThreadGroup.event_ids?.length ?? 0;
    if (messageCount <= 1) {
        return null; // Don't show for single-message groups
    }

    const handleClick = (ev: ButtonEvent): void => {
        // Open AI thread panel in right panel
        const rootEventId = aiThreadGroup.root_event_id ?? aiThreadGroup.event_ids?.[0] ?? eventId;
        RightPanelStore.instance.setCard(
            {
                phase: RightPanelPhases.AIThreadPanel,
                state: {
                    aiThreadGroupId: aiThreadGroup.group_id,
                    aiThreadRootEventId: rootEventId,
                },
            },
            true,
            room.roomId,
        );
        PosthogTrackers.trackInteraction("WebRoomTimelineAIThreadSummaryButton", ev);
    };

    const relatedCount = messageCount - 1; // Exclude root message

    return (
        <AccessibleButton
            className="mx_AIThreadSummary"
            onClick={handleClick}
            aria-label={_t("threads|ai_thread_open", { count: relatedCount })}
        >
            <LinkIcon className="mx_AIThreadSummary_icon" />
            <span className="mx_AIThreadSummary_count">
                {_t("threads|ai_thread_related_count", { count: relatedCount })}
            </span>
            {aiThreadGroup.topic && (
                <span className="mx_AIThreadSummary_topic">{aiThreadGroup.topic}</span>
            )}
            <div className="mx_AIThreadSummary_chevron" />
        </AccessibleButton>
    );
};

export default AIThreadSummary;
