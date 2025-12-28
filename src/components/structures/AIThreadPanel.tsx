/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type Room, type MatrixEvent } from "matrix-js-sdk/src/matrix";
import LinkIcon from "@vector-im/compound-design-tokens/assets/web/icons/link";
import { logger } from "matrix-js-sdk/src/logger";

import BaseCard from "../views/right_panel/BaseCard";
import type ResizeNotifier from "../../utils/ResizeNotifier";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { _t } from "../../languageHandler";
import RoomContext, { TimelineRenderingType } from "../../contexts/RoomContext";
import { Layout } from "../../settings/enums/Layout";
import { type RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import Measured from "../views/elements/Measured";
import Spinner from "../views/elements/Spinner";
import EmptyState from "../views/right_panel/EmptyState";
import { ScopedRoomContextProvider } from "../../contexts/ScopedRoomContext.tsx";
import { useRoomState } from "../../hooks/useRoomState";
import { UnwrappedEventTile } from "../views/rooms/EventTile";
import AutoHideScrollbar from "./AutoHideScrollbar";

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
    room: Room;
    groupId: string;
    rootEventId: string;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    permalinkCreator: RoomPermalinkCreator;
}

const AIThreadPanel: React.FC<IProps> = ({ room, groupId, rootEventId, onClose, permalinkCreator }) => {
    const mxClient = useContext(MatrixClientContext);
    const roomContext = useContext(RoomContext);
    const card = useRef<HTMLDivElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const [narrow, setNarrow] = useState<boolean>(false);
    const [messages, setMessages] = useState<MatrixEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const eventCache = useRef<Map<string, MatrixEvent>>(new Map());

    // Get AI thread state from room
    const aiThreadState = useRoomState<AIThreadsState | undefined>(
        room,
        (state) => {
            const ev = state.getStateEvents(AI_THREADS_EVENT_TYPE, "");
            const event = Array.isArray(ev) ? ev[0] : ev;
            return event?.getContent<AIThreadsState>();
        },
    );

    // Find the specific group
    const group = useMemo(() => {
        if (!aiThreadState?.groups) return undefined;
        const foundGroup = aiThreadState.groups.find((g) => g.group_id === groupId);
        if (!foundGroup) {
            console.warn("AIThreadPanel: Group not found", { groupId, availableGroups: aiThreadState.groups.map((g) => g.group_id) });
        } else {
            console.log("AIThreadPanel: Found group", {
                groupId: foundGroup.group_id,
                rootEventId: foundGroup.root_event_id,
                eventIds: foundGroup.event_ids,
                topic: foundGroup.topic,
            });
        }
        return foundGroup;
    }, [aiThreadState, groupId]);

    const resolveEvent = useCallback(
        async (eventId: string): Promise<MatrixEvent | null> => {
            if (!room) return null;

            if (eventCache.current.has(eventId)) {
                return eventCache.current.get(eventId)!;
            }

            let event = room.findEventById(eventId);
            if (event) {
                eventCache.current.set(eventId, event);
                return event;
            }

            try {
                await mxClient.getEventTimeline(room.getUnfilteredTimelineSet(), eventId);
                event = room.findEventById(eventId);
                if (event) {
                    eventCache.current.set(eventId, event);
                    return event;
                }
            } catch (err) {
                logger.warn(`AIThreadPanel: Failed to load event via timeline ${eventId}:`, err);
                return null;
            }
        },
        [mxClient, room],
    );

    // Separate root message and thread messages
    const { rootMessage, threadMessages } = useMemo(() => {
        if (!messages.length || !rootEventId) {
            return { rootMessage: null, threadMessages: messages };
        }

        const root = messages.find((m) => m.getId() === rootEventId);
        const thread = messages.filter((m) => m.getId() !== rootEventId);

        return { rootMessage: root || null, threadMessages: thread };
    }, [messages, rootEventId]);

    // Fetch messages for this group
    useEffect(() => {
        let cancelled = false;

        const fetchMessages = async (): Promise<void> => {
            if (!group?.event_ids || !room || !groupId) {
                setMessages([]);
                setLoading(false);
                return;
            }

            // Clear cache when groupId changes to avoid showing wrong messages
            eventCache.current.clear();
            setLoading(true);

            const fetchedMessages: MatrixEvent[] = [];

            // Verify we're fetching the correct group's event_ids
            const expectedGroup = aiThreadState?.groups?.find((g) => g.group_id === groupId);
            if (!expectedGroup || expectedGroup.group_id !== group.group_id) {
                logger.warn(
                    `AIThreadPanel: Group mismatch. Expected ${groupId}, got ${group.group_id}. Skipping fetch.`,
                );
                setMessages([]);
                setLoading(false);
                return;
            }

            for (const eventId of group.event_ids) {
                if (cancelled) return;
                const event = await resolveEvent(eventId);
                if (event) {
                    fetchedMessages.push(event);
                }
            }

            if (cancelled) return;

            fetchedMessages.sort((a, b) => a.getTs() - b.getTs());
            setMessages(fetchedMessages);
            setLoading(false);
        };

        fetchMessages();

        return () => {
            cancelled = true;
        };
    }, [group, groupId, resolveEvent, room, aiThreadState]);

    const header = group?.topic || _t("threads|ai_threads");

    return (
        <ScopedRoomContextProvider
            {...roomContext}
            timelineRenderingType={TimelineRenderingType.Thread}
            showHiddenEvents={false}
            narrow={narrow}
        >
            <BaseCard
                header={header}
                id="ai-thread-panel"
                className="mx_AIThreadPanel mx_ThreadPanel mx_ThreadView"
                ariaLabelledBy="ai-thread-panel-tab"
                role="tabpanel"
                onClose={onClose}
                withoutScrollContainer={true}
                ref={card}
                closeButtonRef={closeButtonRef}
            >
                <Measured sensor={card} onMeasurement={setNarrow} />
                {group?.summary && (
                    <div className="mx_AIThreadPanel_summary">
                        <span className="mx_AIThreadPanel_summary_text">{group.summary}</span>
                    </div>
                )}
                {loading ? (
                    <div className="mx_RoomView_messagePanelSpinner">
                        <Spinner />
                    </div>
                ) : messages.length > 0 ? (
                    <div className="mx_ThreadView_timelinePanelWrapper">
                        <AutoHideScrollbar className="mx_RoomView_messagePanel">
                            <div className="mx_RoomView_messageListWrapper">
                                <ol className="mx_RoomView_MessageList" aria-live="polite">
                                    {rootMessage && (
                                        <UnwrappedEventTile
                                            key={rootMessage.getId()}
                                            as="li"
                                            mxEvent={rootMessage}
                                            showUrlPreview={false}
                                            showTimestamp={true}
                                            showReadReceipts={false}
                                            showSender={true}
                                            layout={Layout.Group}
                                            permalinkCreator={permalinkCreator}
                                            continuation={false}
                                        />
                                    )}
                                    {threadMessages.map((event, index) => (
                                        <UnwrappedEventTile
                                            key={event.getId()}
                                            as="li"
                                            mxEvent={event}
                                            showUrlPreview={false}
                                            showTimestamp={true}
                                            showReadReceipts={false}
                                            showSender={true}
                                            layout={Layout.Group}
                                            permalinkCreator={permalinkCreator}
                                            continuation={
                                                index > 0 &&
                                                threadMessages[index - 1].getSender() === event.getSender() &&
                                                event.getTs() - threadMessages[index - 1].getTs() < 300000
                                            }
                                        />
                                    ))}
                                </ol>
                            </div>
                        </AutoHideScrollbar>
                    </div>
                ) : (
                    <EmptyState
                        Icon={LinkIcon}
                        title={_t("threads|ai_threads_no_threads")}
                        description={_t("threads|ai_threads_no_threads_description")}
                    />
                )}
            </BaseCard>
        </ScopedRoomContextProvider>
    );
};

export default AIThreadPanel;

