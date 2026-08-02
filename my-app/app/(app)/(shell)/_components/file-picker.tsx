"use client";

import { useEffect, useMemo, useRef } from "react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function extensionLabel(file: File): string {
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
  return ext && ext.length <= 5 ? ext : "FILE";
}

function FileThumb({ file }: { file: File }) {
  const isImage = file.type.startsWith("image/");
  const previewUrl = useMemo(() => (isImage ? URL.createObjectURL(file) : null), [file, isImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt=""
        className="h-9 w-9 flex-none rounded-[6px] border border-ink/20 object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[6px] border-[1.5px] border-ink/30 font-mono text-[9px] font-bold tracking-[.02em] text-muted">
      {extensionLabel(file)}
    </div>
  );
}

/** File input + selected-files list with a per-file preview and remove control, plus
 * an optional direct-camera-capture button for photographing pages on the spot. File
 * selections across multiple browse/capture actions are merged (deduped by name+size)
 * rather than replaced, so removing one file doesn't force reselecting the rest. */
export function FilePicker({
  files,
  setFiles,
  accept,
  hint,
  disabled,
  allowCamera = false,
}: {
  files: File[];
  setFiles: (files: File[]) => void;
  accept: string;
  hint?: string;
  disabled?: boolean;
  allowCamera?: boolean;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function mergeFiles(picked: File[]) {
    if (picked.length === 0) return;
    const merged = [...files];
    for (const file of picked) {
      const isDuplicate = merged.some((f) => f.name === file.name && f.size === file.size);
      if (!isDuplicate) merged.push(file);
    }
    setFiles(merged);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    mergeFiles(picked);
  }

  function handleRemove(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink/30 px-[18px] py-[18px] text-center font-sans text-[13px] font-semibold text-muted">
          <input
            type="file"
            multiple
            accept={accept}
            disabled={disabled}
            onChange={handleInputChange}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span>
            Drop files here or <span className="text-amber underline">browse</span>
          </span>
          {hint && (
            <span className="font-mono text-[10.5px] font-bold tracking-[.06em] text-faint">
              {hint}
            </span>
          )}
        </label>

        {allowCamera && (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-none items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/30 px-[18px] py-[18px] font-sans text-[13px] font-semibold text-muted disabled:opacity-50 sm:flex-col sm:px-6"
            >
              <span aria-hidden>📷</span>
              <span>Take a photo</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={disabled}
              onChange={handleInputChange}
              className="hidden"
            />
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${file.size}-${i}`}
              className="flex items-center gap-2.5 rounded-[10px] border-[1.5px] border-ink/20 px-2.5 py-2"
            >
              <FileThumb file={file} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-[13px] font-semibold text-ink">
                  {file.name}
                </div>
                <div className="font-mono text-[10px] font-medium text-muted">
                  {formatSize(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                disabled={disabled}
                className="flex-none font-sans text-xs font-semibold text-[#b91c1c] hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
