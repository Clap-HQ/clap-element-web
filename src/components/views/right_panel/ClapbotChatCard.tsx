/*
Copyright 2024 New Vector Ltd.
Copyright 2021, 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { type MatrixEvent, NotificationCountType, type Room } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import BaseCard from "./BaseCard";
import type ResizeNotifier from "../../../utils/ResizeNotifier";
import MessageComposer from "../rooms/MessageComposer";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { Layout } from "../../../settings/enums/Layout";
import TimelinePanel from "../../structures/TimelinePanel";
import { type E2EStatus } from "../../../utils/ShieldUtils";
import EditorStateTransfer from "../../../utils/EditorStateTransfer";
import RoomContext from "../../../contexts/RoomContext";
import dis from "../../../dispatcher/dispatcher";
import { _t } from "../../../languageHandler";
import { type ActionPayload } from "../../../dispatcher/payloads";
import { Action } from "../../../dispatcher/actions";
import ContentMessages from "../../../ContentMessages";
import UploadBar from "../../structures/UploadBar";
import SettingsStore from "../../../settings/SettingsStore";
import JumpToBottomButton from "../rooms/JumpToBottomButton";
import { type ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import Measured from "../elements/Measured";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { ScopedRoomContextProvider } from "../../../contexts/ScopedRoomContext.tsx";
import { MatrixClientPeg } from "../../../MatrixClientPeg";

interface IProps {
    roomId: string;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    permalinkCreator: RoomPermalinkCreator;
    e2eStatus?: E2EStatus;
}

interface IState {
    room: Room | null;
    editState?: EditorStateTransfer;
    replyToEvent?: MatrixEvent;
    initialEventId?: string;
    isInitialEventHighlighted?: boolean;
    layout: Layout;
    atEndOfLiveTimeline: boolean;
    narrow: boolean;
    showReadReceipts?: boolean;
}

export default class ClapbotChatCard extends React.Component<IProps, IState> {
    public static contextType = RoomContext;
    declare public context: React.ContextType<typeof RoomContext>;

    private dispatcherRef?: string;
    private layoutWatcherRef?: string;
    private timelinePanel = React.createRef<TimelinePanel>();
    private card = React.createRef<HTMLDivElement>();
    private readReceiptsSettingWatcher: string | undefined;
    private clapbotPermalinkCreator: RoomPermalinkCreator | null = null;

    public constructor(props: IProps) {
        super(props);
        const room = MatrixClientPeg.safeGet().getRoom(props.roomId);
        this.state = {
            room,
            showReadReceipts: SettingsStore.getValue("showReadReceipts", props.roomId),
            layout: SettingsStore.getValue("layout"),
            atEndOfLiveTimeline: true,
            narrow: false,
        };
        if (room) {
            this.clapbotPermalinkCreator = new RoomPermalinkCreator(room);
        }
    }

    public componentDidMount(): void {
        this.context.roomViewStore.addListener(UPDATE_EVENT, this.onRoomViewStoreUpdate);
        this.dispatcherRef = dis.register(this.onAction);
        this.readReceiptsSettingWatcher = SettingsStore.watchSetting("showReadReceipts", null, (...[, , , value]) =>
            this.setState({ showReadReceipts: value as boolean }),
        );
        this.layoutWatcherRef = SettingsStore.watchSetting("layout", null, (...[, , , value]) =>
            this.setState({ layout: value as Layout }),
        );
        this.clapbotPermalinkCreator?.start();
    }

    public componentWillUnmount(): void {
        this.context.roomViewStore.removeListener(UPDATE_EVENT, this.onRoomViewStoreUpdate);

        SettingsStore.unwatchSetting(this.readReceiptsSettingWatcher);
        SettingsStore.unwatchSetting(this.layoutWatcherRef);

        dis.unregister(this.dispatcherRef);
        this.clapbotPermalinkCreator?.stop();
    }

    private onRoomViewStoreUpdate = async (_initial?: boolean): Promise<void> => {
        const newState: Pick<IState, any> = {
            initialEventId: this.context.roomViewStore.getInitialEventId(),
            isInitialEventHighlighted: this.context.roomViewStore.isInitialEventHighlighted(),
            replyToEvent: this.context.roomViewStore.getQuotingEvent(),
        };

        this.setState(newState);
    };

    private onAction = (payload: ActionPayload): void => {
        switch (payload.action) {
            case Action.EditEvent:
                this.setState(
                    {
                        editState: payload.event ? new EditorStateTransfer(payload.event) : undefined,
                    },
                    () => {
                        if (payload.event) {
                            this.timelinePanel.current?.scrollToEventIfNeeded(payload.event.getId());
                        }
                    },
                );
                break;
            default:
                break;
        }
    };

    private onScroll = (): void => {
        const timelinePanel = this.timelinePanel.current;
        if (!timelinePanel) return;
        if (timelinePanel.isAtEndOfLiveTimeline()) {
            this.setState({
                atEndOfLiveTimeline: true,
            });
        } else {
            this.setState({
                atEndOfLiveTimeline: false,
            });
        }

        if (this.state.initialEventId && this.state.isInitialEventHighlighted && this.state.room) {
            dis.dispatch<ViewRoomPayload>({
                action: Action.ViewRoom,
                room_id: this.state.room.roomId,
                event_id: this.state.initialEventId,
                highlighted: false,
                replyingToEvent: this.state.replyToEvent,
                metricsTrigger: undefined,
            });
        }
    };

    private onMeasurement = (narrow: boolean): void => {
        this.setState({ narrow });
    };

    private jumpToLiveTimeline = (): void => {
        if (this.state.initialEventId && this.state.isInitialEventHighlighted && this.state.room) {
            dis.dispatch({
                action: Action.ViewRoom,
                room_id: this.state.room.roomId,
            });
        } else {
            this.timelinePanel.current?.jumpToLiveTimeline();
            dis.fire(Action.FocusSendMessageComposer);
        }
    };

    public render(): React.ReactNode {
        const { room } = this.state;

        if (!room) {
            return (
                <BaseCard
                    className="mx_ThreadPanel mx_TimelineCard"
                    onClose={this.props.onClose}
                    header={_t("right_panel|clapbot_chat|title")}
                >
                    <div className="mx_TimelineCard_timeline">
                        <p style={{ padding: "16px", textAlign: "center" }}>{_t("right_panel|clapbot_chat|loading")}</p>
                    </div>
                </BaseCard>
            );
        }

        const highlightedEventId = this.state.isInitialEventHighlighted ? this.state.initialEventId : undefined;

        let jumpToBottom;
        if (!this.state.atEndOfLiveTimeline) {
            jumpToBottom = (
                <JumpToBottomButton
                    highlight={room.getUnreadNotificationCount(NotificationCountType.Highlight) > 0}
                    onScrollToBottomClick={this.jumpToLiveTimeline}
                />
            );
        }

        const isUploading = ContentMessages.sharedInstance().getCurrentUploads().length > 0;

        const myMembership = room.getMyMembership();
        const showComposer = myMembership === KnownMembership.Join;

        const timelineSet = room.getUnfilteredTimelineSet();

        return (
            <ScopedRoomContextProvider
                {...this.context}
                timelineRenderingType={this.context.timelineRenderingType}
                liveTimeline={timelineSet?.getLiveTimeline()}
                narrow={this.state.narrow}
            >
                <BaseCard
                    className="mx_ThreadPanel mx_TimelineCard"
                    onClose={this.props.onClose}
                    withoutScrollContainer={true}
                    header={_t("right_panel|clapbot_chat|title")}
                    ref={this.card}
                >
                    <Measured sensor={this.card} onMeasurement={this.onMeasurement} />
                    <div className="mx_TimelineCard_timeline">
                        {jumpToBottom}
                        <TimelinePanel
                            ref={this.timelinePanel}
                            showReadReceipts={this.state.showReadReceipts}
                            manageReadReceipts={true}
                            manageReadMarkers={false}
                            sendReadReceiptOnLoad={true}
                            timelineSet={timelineSet}
                            showUrlPreview={this.context.showUrlPreview}
                            layout={this.state.layout === Layout.Bubble ? Layout.Bubble : Layout.Group}
                            hideThreadedMessages={false}
                            hidden={false}
                            showReactions={true}
                            className="mx_RoomView_messagePanel"
                            permalinkCreator={this.clapbotPermalinkCreator!}
                            membersLoaded={true}
                            editState={this.state.editState}
                            eventId={this.state.initialEventId}
                            highlightedEventId={highlightedEventId}
                            onScroll={this.onScroll}
                        />
                    </div>

                    {isUploading && <UploadBar room={room} />}

                    {showComposer && (
                        <MessageComposer
                            room={room}
                            resizeNotifier={this.props.resizeNotifier}
                            replyToEvent={this.state.replyToEvent}
                            permalinkCreator={this.clapbotPermalinkCreator!}
                            e2eStatus={this.props.e2eStatus}
                            compact={true}
                        />
                    )}
                </BaseCard>
            </ScopedRoomContextProvider>
        );
    }
}
