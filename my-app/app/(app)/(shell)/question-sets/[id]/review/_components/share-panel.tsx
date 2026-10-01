"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { regenerateShareLink, toggleSharing } from "@/actions/question-sets";
import { Switch } from "@/app/_components/switch";

export function SharePanel({
  questionSetId,
  status,
  isShared,
  shareSlug,
}: {
  questionSetId: string;
  status: string;
  isShared: boolean;
  shareSlug: string | null;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rendered consistently as a relative path on both server and client to
  // avoid a hydration mismatch; handleCopy below resolves it to an absolute
  // URL (window.location.origin only exists client-side) at copy time.
  const shareUrl = shareSlug ? `/shared/${shareSlug}` : null;

  async function handleToggle(enabled: boolean) {
    setError(null);
    setIsUpdating(true);
    try {
      await toggleSharing({ questionSetId, enabled });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRegenerate() {
    if (!window.confirm("Regenerate the share link? The old link will stop working immediately.")) {
      return;
    }
    setError(null);
    setIsUpdating(true);
    try {
      await regenerateShareLink(questionSetId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/blocked — the link is still shown as text to copy manually.
    }
  }

  const canShare = status === "READY";

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-ink/20 p-4">
      <Switch
        checked={isShared}
        onChange={handleToggle}
        label="Share with a public link"
        description={
          canShare
            ? "Anyone with the link can view and take this quiz without an account."
            : "Finish reviewing this set (mark it ready) before sharing it."
        }
      />
      {!canShare ? null : isUpdating ? (
        <p className="font-sans text-[13px] font-medium text-muted">Updating…</p>
      ) : (
        isShared &&
        shareUrl && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate rounded-lg border-[1.5px] border-ink/20 bg-paper px-3 py-2 font-mono text-xs text-ink">
                {shareUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-9 flex-none items-center rounded-lg border-[1.5px] border-ink px-3 font-sans text-xs font-bold text-ink"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              className="w-fit font-sans text-xs font-semibold text-muted hover:text-ink hover:underline"
            >
              Regenerate link
            </button>
          </div>
        )
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
