/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useMemo } from "react";
import { Text } from "@vector-im/compound-web";
import LinkIcon from "@vector-im/compound-design-tokens/assets/web/icons/link";
import { type Room } from "matrix-js-sdk/src/matrix";

import BaseCard from "../views/right_panel/BaseCard";
import EmptyState from "../views/right_panel/EmptyState";
import AccessibleButton from "../views/elements/AccessibleButton";
import { _t } from "../../languageHandler";
import { useRoomState } from "../../hooks/useRoomState";
import RightPanelStore from "../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../stores/right-panel/RightPanelStorePhases";
import { formatRelativeTime } from "../../DateUtils";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type ComposerInsertPayload, ComposerType } from "../../dispatcher/payloads/ComposerInsertPayload";
import { TimelineRenderingType } from "../../contexts/RoomContext";
import PosthogTrackers from "../../PosthogTrackers";

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
    updated_at?: string;
    sampled_count?: number;
}

interface IProps {
    room: Room;
    onClose: () => void;
}

const AIThreadListPanel: React.FC<IProps> = ({ room, onClose }) => {
    const aiThreadState = useRoomState<AIThreadsState | undefined>(
        room,
        (state) => {
            const ev = state.getStateEvents(AI_THREADS_EVENT_TYPE, "");
            const event = Array.isArray(ev) ? ev[0] : ev;
            return event?.getContent<AIThreadsState>();
        },
    );

    const groups = useMemo(() => {
        if (!aiThreadState?.groups) return [];
        return [...aiThreadState.groups].sort((a, b) => (b.last_ts ?? 0) - (a.last_ts ?? 0));
    }, [aiThreadState]);

    const lastUpdatedTs = useMemo(() => {
        if (aiThreadState?.updated_at) {
            const parsed = Date.parse(aiThreadState.updated_at);
            if (!Number.isNaN(parsed)) return parsed;
        }
        return groups[0]?.last_ts ?? null;
    }, [aiThreadState, groups]);

    const handleOpenGroup = (group: AIThreadGroup): void => {
        const rootEventId = group.root_event_id ?? group.event_ids?.[0];
        if (!rootEventId) {
            console.warn("AIThreadListPanel: No rootEventId found for group", group.group_id);
            return;
        }

        console.log("AIThreadListPanel: Opening group", {
            groupId: group.group_id,
            rootEventId,
            eventIds: group.event_ids,
            topic: group.topic,
        });

        RightPanelStore.instance.pushCard(
            {
                phase: RightPanelPhases.AIThreadPanel,
                state: {
                    aiThreadGroupId: group.group_id,
                    aiThreadRootEventId: rootEventId,
                },
            },
            true,
            room.roomId,
        );
        PosthogTrackers.trackInteraction("WebAIThreadListOpenGroup", group.group_id);
    };

    const handleInsertRefreshCommand = (): void => {
        defaultDispatcher.dispatch<ComposerInsertPayload>({
            action: Action.ComposerInsert,
            timelineRenderingType: TimelineRenderingType.Room,
            composerType: ComposerType.Send,
            text: "!ai-threads refresh",
        });
        defaultDispatcher.dispatch({ action: Action.FocusSendMessageComposer });
        PosthogTrackers.trackInteraction("WebAIThreadListInsertRefresh");
    };

    const header = (
        <div className="mx_AIThreadListPanel_header">
            <div className="mx_AIThreadListPanel_headerRow">
                <Text as="span" weight="semibold" className="mx_AIThreadListPanel_headerTitle">
                    {_t("threads|ai_threads")}
                </Text>
            </div>
            <div className="mx_AIThreadListPanel_headerRow">
                <span className="mx_AIThreadListPanel_headerHint">
                    {_t("threads|ai_threads_meta_hint")}
                </span>
            </div>
        </div>
    );

    return (
        <BaseCard
            header={header}
            id="ai-thread-list-panel"
            className="mx_AIThreadListPanel"
            ariaLabelledBy="ai-thread-list-panel-tab"
            role="tabpanel"
            onClose={onClose}
        >
            {groups.length === 0 ? (
                <div className="mx_AIThreadListPanel_empty">
                    <EmptyState
                        Icon={LinkIcon}
                        title={_t("threads|ai_threads_no_threads")}
                        description={_t("threads|ai_threads_no_threads_description")}
                    />
                    <AccessibleButton kind="primary_outline" onClick={handleInsertRefreshCommand}>
                        {_t("threads|ai_threads_request_refresh_button")}
                    </AccessibleButton>
                </div>
            ) : (
                <div className="mx_AIThreadListPanel_list">
                    {groups.map((group) => {
                        const messageCount = group.message_count ?? group.event_ids?.length ?? 0;
                        const lastUpdated = group.last_ts
                            ? formatRelativeTime(new Date(group.last_ts))
                            : _t("threads|ai_threads_last_updated", { time: "—" });

                        return (
                            <AccessibleButton
                                key={group.group_id}
                                className="mx_AIThreadListPanel_row"
                                onClick={() => handleOpenGroup(group)}
                            >
                                <div className="mx_AIThreadListPanel_rowHeader">
                                    <span className="mx_AIThreadListPanel_topic">
                                        {group.topic || _t("threads|ai_threads_default_topic")}
                                    </span>
                                    <span className="mx_AIThreadListPanel_count">
                                        {_t("threads|ai_thread_related_count", { count: messageCount })}
                                    </span>
                                </div>
                                {group.summary && (
                                    <div className="mx_AIThreadListPanel_summary">{group.summary}</div>
                                )}
                                <div className="mx_AIThreadListPanel_rowMeta">{lastUpdated}</div>
                            </AccessibleButton>
                        );
                    })}
                </div>
            )}
        </BaseCard>
    );
};

export default AIThreadListPanel;


