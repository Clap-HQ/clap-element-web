/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { RoomEvent, type MatrixEvent, type Room, MsgType } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import type { RoomMessageEventContent } from "matrix-js-sdk/src/types";
import { IconButton, Tooltip } from "@vector-im/compound-web";
import EditIcon from "@vector-im/compound-design-tokens/assets/web/icons/edit";
import RestartIcon from "@vector-im/compound-design-tokens/assets/web/icons/restart";
import CheckIcon from "@vector-im/compound-design-tokens/assets/web/icons/check";
import CloseIcon from "@vector-im/compound-design-tokens/assets/web/icons/close";

import { MatrixClientPeg } from "../../MatrixClientPeg";
import BaseCard from "../views/right_panel/BaseCard";
import Spinner from "../views/elements/Spinner";
import Markdown from "../../Markdown";
import { _t } from "../../languageHandler";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import type { ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { parsePermalink } from "../../utils/permalinks/Permalinks";
import { getUserTimezone } from "../../TimezoneHandler";
import { getUserLanguage } from "../../languageHandler";

interface IProps {
    roomId: string;
    onClose: () => void;
}

/**
 * Component which shows the latest markdown content from clap-assistant bot
 * @returns React element displaying markdown panel in right panel
 */
export default function MarkdownPanel({ roomId, onClose }: IProps): React.ReactElement {
    const [markdownContent, setMarkdownContent] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [editContent, setEditContent] = useState<string>("");
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [hasLocalChanges, setHasLocalChanges] = useState<boolean>(false);
    const card = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const renderedContentRef = useRef<HTMLDivElement>(null);

    // Convert markdown to HTML for view mode
    const htmlContent = useMemo(() => {
        if (!markdownContent) return null;
        try {
            const md = new Markdown(markdownContent);
            let html = md.toHTML({ externalLinks: true });
            // Replace [x] with checked checkbox icon SVG
            const checkedCheckboxSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><rect x="2" y="2" width="12" height="12" rx="2" fill="var(--cpd-color-bg-action-primary-rest)" stroke="var(--cpd-color-bg-action-primary-rest)" stroke-width="1"/><path d="M5 8L7 10L11 6" stroke="var(--cpd-color-text-on-solid-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            html = html.replace(/\[x\]/gi, checkedCheckboxSvg);
            // Also replace [ ] with empty checkbox for consistency
            const emptyCheckboxSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
            html = html.replace(/\[\s\]/g, emptyCheckboxSvg);
            return html;
        } catch (error) {
            logger.error("Failed to parse markdown", error);
            return null;
        }
    }, [markdownContent]);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current && isEditing) {
            const textarea = textareaRef.current;
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 600)}px`;
        }
    }, [editContent, isEditing]);

    // Handle link clicks in rendered markdown
    useEffect(() => {
        if (!renderedContentRef.current || isEditing) return;

        const handleLinkClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest("a");
            if (!link) return;

            const href = link.getAttribute("href");
            if (!href) return;

            // Check if it's a matrix permalink
            try {
                const permalink = parsePermalink(href);
                if (permalink?.roomIdOrAlias) {
                    e.preventDefault();
                    e.stopPropagation();

                    const payload: ViewRoomPayload = {
                        action: Action.ViewRoom,
                        room_id: permalink.roomIdOrAlias.startsWith("!") ? permalink.roomIdOrAlias : undefined,
                        room_alias: permalink.roomIdOrAlias.startsWith("#") ? permalink.roomIdOrAlias : undefined,
                        event_id: permalink.eventId ?? undefined,
                        via_servers: permalink.viaServers ?? undefined,
                        highlighted: Boolean(permalink.eventId),
                        metricsTrigger: undefined,
                    };

                    defaultDispatcher.dispatch(payload);
                }
            } catch (error) {
                // Not a permalink, let browser handle it normally
            }
        };

        const container = renderedContentRef.current;
        container.addEventListener("click", handleLinkClick);

        return () => {
            container.removeEventListener("click", handleLinkClick);
        };
    }, [htmlContent, isEditing]);

    // Get storage key for this room's markdown content
    const getStorageKey = useCallback(() => {
        return `markdown_panel_${roomId}`;
    }, [roomId]);

    // Load saved content from localStorage
    const loadSavedContent = useCallback(() => {
        try {
            const storageKey = getStorageKey();
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setMarkdownContent(saved);
                setEditContent(saved);
                setHasLocalChanges(true);
                return true;
            }
        } catch (error) {
            logger.error("Failed to load saved markdown content", error);
        }
        return false;
    }, [getStorageKey]);

    const fetchLatestMarkdown = useCallback(async () => {
        // First check if there's saved content in localStorage
        if (loadSavedContent()) {
            setLoading(false);
            return;
        }

        const client = MatrixClientPeg.safeGet();
        const room = client.getRoom(roomId);

        if (!room) {
            logger.error("Room not found for markdown panel");
            setLoading(false);
            return;
        }

        try {
            // Get the live timeline
            const timeline = room.getLiveTimeline();
            const events = timeline.getEvents();

            // Search backwards for the most recent markdown message
            // Look for messages from clap-assistant bot with formatted_body
            for (let i = events.length - 1; i >= 0; i--) {
                const event = events[i];
                const content = event.getContent();
                const sender = event.getSender();

                // Check if message is from clap-assistant or has markdown-like content
                if (
                    event.getType() === "m.room.message" &&
                    content.msgtype === "m.text" &&
                    content &&
                    content.body
                ) {
                    // Accept immediately if from clap-assistant with formatted_body
                    const isFromClapAssistant = sender?.includes("clap-assistant");
                    if (isFromClapAssistant && content.formatted_body) {
                        let body = content.body;
                        // Remove edit info if present (at the end)
                        body = body.replace(/\n\n---\n<small>Last modified by .+? at .+?<\/small>$/, "");
                        body = body.replace(/\n\n---\nLast modified by .+? at .+?$/, "");
                        setMarkdownContent(body);
                        setEditContent(body);
                        setLoading(false);
                        return;
                    }

                    // Otherwise, test body with strict regex for markdown headers or standalone "# TODO"
                    // Match markdown headers: 1-6 '#' at line start followed by space
                    // Match standalone "# TODO" token
                    const markdownHeaderRegex = /^#{1,6}\s/m;
                    const standaloneTodoRegex = /^# TODO\b/m;
                    let body = content.body;
                    // Remove edit info if present (at the end)
                    body = body.replace(/\n\n---\n<small>Last modified by .+? at .+?<\/small>$/, "");
                    body = body.replace(/\n\n---\nLast modified by .+? at .+?$/, "");
                    const hasMarkdownHeader = markdownHeaderRegex.test(body);
                    const hasStandaloneTodo = standaloneTodoRegex.test(body);

                    if (hasMarkdownHeader || hasStandaloneTodo) {
                        setMarkdownContent(body);
                        setEditContent(body);
                        setLoading(false);
                        return;
                    }
                }
            }

            // If no markdown found in current timeline, that's okay - user can still edit

            // No markdown content found
            setLoading(false);
        } catch (error) {
            logger.error("Failed to fetch markdown content", error);
            setLoading(false);
        }
    }, [roomId, loadSavedContent]);

    useEffect(() => {
        // Only fetch if there are no local changes
        if (!hasLocalChanges) {
            fetchLatestMarkdown();
        }

        // Listen for new messages to update the panel
        const client = MatrixClientPeg.safeGet();
        const room = client.getRoom(roomId);

        if (room) {
            const onTimeline = (event: MatrixEvent, room: Room | undefined) => {
                if (room?.roomId === roomId && !hasLocalChanges) {
                    const content = event.getContent();
                    const sender = event.getSender();

                    if (
                        event.getType() === "m.room.message" &&
                        content.msgtype === "m.text" &&
                        (sender?.includes("clap-assistant") ||
                         content.body?.includes("# TODO") ||
                         content.formatted_body)
                    ) {
                        fetchLatestMarkdown();
                    }
                }
            };

            room.on(RoomEvent.Timeline, onTimeline);

            return () => {
                room.off(RoomEvent.Timeline, onTimeline);
            };
        }
    }, [roomId, fetchLatestMarkdown, hasLocalChanges]);

    const handleSave = async () => {
        try {
            setLoading(true);
            
            const client = MatrixClientPeg.safeGet();
            
            // Get current user's full ID
            const currentUserId = client.getUserId() || "Unknown";
            const editorId = currentUserId;
            
            // Get current timestamp with timezone
            const now = new Date();
            const timeZone = getUserTimezone();
            const locale = getUserLanguage();
            
            // Format date in simple format: YYYY-MM-DD HH:MM TZ
            const dateStr = new Intl.DateTimeFormat(locale, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                timeZone: timeZone,
            }).format(now).replace(/\//g, "-");
            
            const timeStr = new Intl.DateTimeFormat(locale, {
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
                timeZone: timeZone,
            }).format(now);
            
            const timeZoneStr = new Intl.DateTimeFormat(locale, {
                timeZoneName: "short",
                timeZone: timeZone,
            }).formatToParts(now).find(part => part.type === "timeZoneName")?.value || "";
            
            const formattedTime = `${dateStr} ${timeStr} ${timeZoneStr}`.trim();
            
            // Add edit info to message body at the end
            const editInfo = `\n\n---\n<small>Last modified by ${editorId} at ${formattedTime}</small>`;
            const bodyWithEditInfo = editContent + editInfo;
            
            // Convert markdown to HTML for formatted_body
            const md = new Markdown(editContent);
            const html = md.toHTML({ externalLinks: true });
            const editInfoHtml = `\n\n<hr>\n<p style="font-size: 0.875em; color: #6b7280; margin-top: 1em;"><em>Last modified by <strong>${editorId}</strong> at ${formattedTime}</em></p>`;
            const htmlWithEditInfo = html + editInfoHtml;
            
            // Prepare message content
            const content: RoomMessageEventContent = {
                msgtype: MsgType.Text,
                body: bodyWithEditInfo,
                format: "org.matrix.custom.html",
                formatted_body: htmlWithEditInfo,
            };
            
            // Send to server
            await client.sendMessage(roomId, content);
            
            // Also save to localStorage for persistence
            const storageKey = getStorageKey();
            localStorage.setItem(storageKey, editContent);
            
            // Update state
            setMarkdownContent(editContent);
            setIsEditing(false);
            setHasLocalChanges(false); // Reset since we saved to server
            setLoading(false);
            logger.info("Markdown content saved to server");
        } catch (error) {
            logger.error("Failed to save markdown content to server", error);
            setLoading(false);
            // Still update state even if server save fails
            try {
                const storageKey = getStorageKey();
                localStorage.setItem(storageKey, editContent);
            } catch (localError) {
                logger.error("Failed to save markdown content to localStorage", localError);
            }
            setMarkdownContent(editContent);
            setIsEditing(false);
            setHasLocalChanges(true);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditContent(markdownContent || "");
        setIsEditing(false);
    };

    const handleRefresh = () => {
        // Clear saved content and reload from server
        try {
            const storageKey = getStorageKey();
            localStorage.removeItem(storageKey);
        } catch (error) {
            logger.error("Failed to clear saved markdown content", error);
        }
        setHasLocalChanges(false);
        setLoading(true);
        fetchLatestMarkdown();
    };

    if (loading) {
        return (
            <BaseCard
                className="mx_MarkdownPanel"
                onClose={onClose}
                header="Markdown"
            >
                <Spinner />
            </BaseCard>
        );
    }

    return (
        <BaseCard
            className="mx_MarkdownPanel"
            onClose={onClose}
            ref={card}
            header="Markdown"
        >
            <div className="mx_MarkdownPanel_content">
                <div className="mx_MarkdownPanel_toolbar">
                    {isEditing ? (
                        <>
                            <Tooltip label={_t("action|save")}>
                                <IconButton onClick={handleSave}>
                                    <CheckIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip label={_t("action|cancel")}>
                                <IconButton onClick={handleCancel}>
                                    <CloseIcon />
                                </IconButton>
                            </Tooltip>
                        </>
                    ) : (
                        <>
                            <Tooltip label={_t("action|refresh")}>
                                <IconButton onClick={handleRefresh}>
                                    <RestartIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip label={_t("action|edit")}>
                                <IconButton onClick={handleEdit}>
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                </div>
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        className="mx_MarkdownPanel_editor"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder={markdownContent ? "Edit markdown content here..." : "No markdown content found. Start editing here..."}
                    />
                ) : (
                    <div
                        ref={renderedContentRef}
                        className="mx_MarkdownPanel_rendered"
                        dangerouslySetInnerHTML={{ __html: htmlContent || "<p>No markdown content found.</p>" }}
                    />
                )}
            </div>
        </BaseCard>
    );
}
