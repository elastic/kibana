/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComment,
  EuiCommentList,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

const SO_TYPE = 'observability-onboarding-ui-comment';
const IDENTITY_KEY = 'kibana_ui_commenter_name';

interface Reply {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface Comment {
  id: string; // saved object id
  clientX: number;
  clientY: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
  pathname: string;
}

interface SavedObjectAttributes {
  clientX: number;
  clientY: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
  pathname: string;
}

interface HttpService {
  get: <T>(path: string, options?: { query?: Record<string, unknown> }) => Promise<T>;
  post: <T>(path: string, options?: { body?: string }) => Promise<T>;
  put: <T>(path: string, options?: { body?: string }) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const soToComment = (so: { id: string; attributes: SavedObjectAttributes }): Comment => ({
  id: so.id,
  ...so.attributes,
  replies: so.attributes.replies ?? [],
});

export const CommentOverlay: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<{ http: HttpService }>();

  const [currentUser, setCurrentUser] = useState<string | null>(
    () => localStorage.getItem(IDENTITY_KEY)
  );
  const [nameInput, setNameInput] = useState('');
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);
  const pendingActivation = useRef(false);

  const [isCommentMode, setIsCommentMode] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [newText, setNewText] = useState('');
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const keysHeld = useRef(new Set<string>());

  // Load all comments from saved objects on mount
  useEffect(() => {
    setLoading(true);
    services.http
      .get<{ saved_objects: Array<{ id: string; attributes: SavedObjectAttributes }> }>(
        `/api/saved_objects/_find`,
        { query: { type: SO_TYPE, per_page: 500 } }
      )
      .then(({ saved_objects }) => {
        setComments(saved_objects.map(soToComment));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [services.http]);

  const activateCommentMode = useCallback(() => {
    if (!currentUser) {
      pendingActivation.current = true;
      setShowIdentityPrompt(true);
    } else {
      setIsCommentMode((prev) => !prev);
      setPendingPos(null);
    }
  }, [currentUser]);

  // Keyboard shortcut: Shift + A + C
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysHeld.current.add(e.key.toLowerCase());
      if (e.shiftKey && keysHeld.current.has('a') && keysHeld.current.has('c')) {
        keysHeld.current.clear();
        activateCommentMode();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysHeld.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activateCommentMode]);

  const submitIdentity = () => {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(IDENTITY_KEY, name);
    setCurrentUser(name);
    setShowIdentityPrompt(false);
    setNameInput('');
    if (pendingActivation.current) {
      pendingActivation.current = false;
      setIsCommentMode(true);
    }
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-comment-pin]')) return;
    setPendingPos({ x: e.clientX, y: e.clientY });
    setOpenPinId(null);
  }, []);

  const saveComment = async () => {
    if (!pendingPos || !newText.trim() || !currentUser) return;
    const attributes: SavedObjectAttributes = {
      clientX: pendingPos.x,
      clientY: pendingPos.y,
      text: newText.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
      pathname: window.location.pathname,
    };
    setSaving(true);
    try {
      const created = await services.http.post<{ id: string; attributes: SavedObjectAttributes }>(
        `/api/saved_objects/${SO_TYPE}`,
        { body: JSON.stringify({ attributes }) }
      );
      setComments((prev) => [...prev, soToComment(created)]);
      setPendingPos(null);
      setNewText('');
      setIsCommentMode(false);
    } catch {
      // keep pending pos open on failure
    } finally {
      setSaving(false);
    }
  };

  const toggleResolved = async (id: string) => {
    const comment = comments.find((c) => c.id === id);
    if (!comment) return;
    const updated = { ...comment, resolved: !comment.resolved };
    setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
    await services.http
      .put(`/api/saved_objects/${SO_TYPE}/${id}`, {
        body: JSON.stringify({
          attributes: { resolved: updated.resolved },
        }),
      })
      .catch(() => {
        // revert on failure
        setComments((prev) => prev.map((c) => (c.id === id ? comment : c)));
      });
    setOpenPinId(null);
  };

  const deleteComment = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    if (openPinId === id) setOpenPinId(null);
    await services.http.delete(`/api/saved_objects/${SO_TYPE}/${id}`).catch(() => {});
  };

  const addReply = async (commentId: string) => {
    if (!replyText.trim() || !currentUser) return;
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    const newReply: Reply = {
      id: generateId(),
      text: replyText.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
    };
    const updatedReplies = [...comment.replies, newReply];
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, replies: updatedReplies } : c))
    );
    setReplyText('');
    await services.http
      .put(`/api/saved_objects/${SO_TYPE}/${commentId}`, {
        body: JSON.stringify({ attributes: { replies: updatedReplies } }),
      })
      .catch(() => {
        // revert on failure
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, replies: comment.replies } : c))
        );
      });
  };

  const resolvedCount = comments.filter((c) => c.resolved).length;
  const visibleComments = comments.filter((c) => showResolved || !c.resolved);

  return ReactDOM.createPortal(
    <>
      {/* Identity prompt — shown once on first use */}
      {showIdentityPrompt && (
        <div
          css={css`
            position: fixed;
            inset: 0;
            z-index: 10010;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.4);
          `}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowIdentityPrompt(false);
              pendingActivation.current = false;
            }
          }}
        >
          <div
            css={css`
              background: ${euiTheme.colors.backgroundBasePlain};
              border-radius: 10px;
              padding: 28px 32px;
              width: 340px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            `}
          >
            <EuiTitle size="s">
              <h3>What&apos;s your name?</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>Your name will appear on the comments you leave. Only asked once.</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFieldText
              placeholder="e.g. Sarah"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              fullWidth
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitIdentity();
                if (e.key === 'Escape') {
                  setShowIdentityPrompt(false);
                  pendingActivation.current = false;
                }
              }}
            />
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={() => {
                    setShowIdentityPrompt(false);
                    pendingActivation.current = false;
                  }}
                >
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton size="s" fill onClick={submitIdentity} isDisabled={!nameInput.trim()}>
                  Continue
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      )}

      {/* Click-capture overlay in comment mode */}
      {isCommentMode && (
        <div
          onClick={handleOverlayClick}
          css={css`
            position: fixed;
            inset: 0;
            z-index: 9990;
            cursor: crosshair;
          `}
        />
      )}

      {/* Mode banner */}
      {isCommentMode && (
        <div
          css={css`
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10002;
            background: ${euiTheme.colors.backgroundFilledPrimary};
            color: #fff;
            padding: 8px 20px;
            border-radius: 24px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
            pointer-events: auto;
          `}
        >
          <span>
            💬 Commenting as <strong>{currentUser}</strong> — click anywhere to add a comment
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCommentMode(false);
              setPendingPos(null);
            }}
            css={css`
              background: rgba(255, 255, 255, 0.2);
              border: none;
              color: #fff;
              border-radius: 6px;
              padding: 2px 10px;
              cursor: pointer;
              font-size: 12px;
              &:hover {
                background: rgba(255, 255, 255, 0.35);
              }
            `}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div
          css={css`
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10001;
          `}
        >
          <EuiLoadingSpinner size="m" />
        </div>
      )}

      {/* Show/hide resolved toggle */}
      {!loading && resolvedCount > 0 && (
        <div
          css={css`
            position: fixed;
            bottom: 80px;
            right: 24px;
            z-index: 10001;
          `}
        >
          <button
            onClick={() => setShowResolved((v) => !v)}
            css={css`
              background: ${euiTheme.colors.backgroundBasePlain};
              border: 1px solid ${euiTheme.colors.borderBaseSubdued};
              border-radius: 8px;
              padding: 4px 12px;
              font-size: 12px;
              cursor: pointer;
              color: ${euiTheme.colors.textSubdued};
              white-space: nowrap;
              &:hover {
                background: ${euiTheme.colors.backgroundBaseSubdued};
              }
            `}
          >
            {showResolved ? 'Hide resolved' : `Show resolved (${resolvedCount})`}
          </button>
        </div>
      )}

      {/* Pending comment input */}
      {pendingPos && (
        <div
          data-comment-pin="true"
          css={css`
            position: fixed;
            top: ${pendingPos.y}px;
            left: ${pendingPos.x}px;
            z-index: 10001;
            transform: translate(-50%, -110%);
            pointer-events: auto;
          `}
        >
          <div
            css={css`
              background: ${euiTheme.colors.backgroundBasePlain};
              border: 1px solid ${euiTheme.colors.borderBaseSubdued};
              border-radius: 8px;
              padding: 12px;
              width: 300px;
              box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
            `}
          >
            <EuiTextArea
              placeholder="Add a comment… (Ctrl+Enter to save)"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
              fullWidth
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveComment();
                if (e.key === 'Escape') {
                  setPendingPos(null);
                  setNewText('');
                }
              }}
            />
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={() => {
                    setPendingPos(null);
                    setNewText('');
                  }}
                >
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  onClick={saveComment}
                  isDisabled={!newText.trim()}
                  isLoading={saving}
                >
                  Save
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
          <div
            css={css`
              width: 0;
              height: 0;
              border-left: 7px solid transparent;
              border-right: 7px solid transparent;
              border-top: 9px solid ${euiTheme.colors.borderBaseSubdued};
              margin: 0 auto;
            `}
          />
        </div>
      )}

      {/* Comment pins */}
      {visibleComments.map((comment, index) => (
        <div
          key={comment.id}
          data-comment-pin="true"
          css={css`
            position: fixed;
            top: ${comment.clientY}px;
            left: ${comment.clientX}px;
            z-index: 9999;
            pointer-events: auto;
          `}
        >
          <EuiPopover
            isOpen={openPinId === comment.id}
            closePopover={() => {
              setOpenPinId(null);
              setReplyText('');
            }}
            panelPaddingSize="m"
            panelStyle={{ width: 320 }}
            button={
              <button
                data-comment-pin="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPinId(openPinId === comment.id ? null : comment.id);
                }}
                css={css`
                  width: 28px;
                  height: 28px;
                  border-radius: 50% 50% 50% 0;
                  transform: rotate(-45deg) translate(-50%, -100%);
                  background: ${comment.resolved
                    ? euiTheme.colors.textSubdued
                    : euiTheme.colors.backgroundFilledPrimary};
                  border: 2px solid #fff;
                  cursor: pointer;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: transform 0.15s ease, box-shadow 0.15s ease;
                  &:hover {
                    transform: rotate(-45deg) translate(-50%, -100%) scale(1.2);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                  }
                `}
              >
                <span
                  css={css`
                    transform: rotate(45deg);
                    color: #fff;
                    font-size: 10px;
                    font-weight: 700;
                  `}
                >
                  {index + 1}
                </span>
              </button>
            }
          >
            <EuiCommentList aria-label={`Comment ${index + 1}`}>
              <EuiComment
                username={comment.author}
                timestamp={new Date(comment.createdAt).toLocaleString()}
                event="commented"
                actions={
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    size="xs"
                    aria-label="Delete comment"
                    onClick={() => deleteComment(comment.id)}
                  />
                }
              >
                <EuiText size="s">
                  <p>{comment.text}</p>
                </EuiText>
              </EuiComment>
              {comment.replies.map((reply) => (
                <EuiComment
                  key={reply.id}
                  username={reply.author}
                  timestamp={new Date(reply.createdAt).toLocaleString()}
                  event="replied"
                >
                  <EuiText size="s">
                    <p>{reply.text}</p>
                  </EuiText>
                </EuiComment>
              ))}
            </EuiCommentList>

            <EuiSpacer size="s" />
            <EuiTextArea
              placeholder="Reply… (Ctrl+Enter to send)"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              fullWidth
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addReply(comment.id);
              }}
            />
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiButtonEmpty
                  size="s"
                  iconType={comment.resolved ? 'refresh' : 'checkInCircleFilled'}
                  color={comment.resolved ? 'text' : 'success'}
                  onClick={() => toggleResolved(comment.id)}
                >
                  {comment.resolved ? 'Reopen' : 'Resolve'}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  isDisabled={!replyText.trim()}
                  onClick={() => addReply(comment.id)}
                >
                  Reply
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopover>
        </div>
      ))}
    </>,
    document.body
  );
};
